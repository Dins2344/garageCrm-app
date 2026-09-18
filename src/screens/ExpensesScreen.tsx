import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, ListRenderItem } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { getExpenses, createExpense, updateExpense, deleteExpense } from '../api/expenseService';
import { useGarage } from '../context/GarageContext';
import { useGlobalLoader } from '../context/GlobalLoaderContext';
import { useDebounce } from '../hooks/useDebounce';
import ResponsiveScreen from '../components/ResponsiveScreen';
import BottomSheet, { SheetActions } from '../components/BottomSheet';
import BottomSheetPicker from '../components/BottomSheetPicker';
import CalendarModal from '../components/CalendarModal';
import MonthStepper from '../components/MonthStepper';
import { ControlledField, ControlledPicker } from '../components/FormControls';
import { formatMoney, formatDate } from '../utils/format';
import { currentMonthKey } from '../utils/months';
import { EXPENSE_CATEGORY_OPTIONS, EXPENSE_CATEGORY_LABEL, EXPENSE_PAYMENT_METHOD_OPTIONS } from '../utils/expenseOptions';
import { expenseSchema, type ExpenseFormValues, type ExpenseFormOutput } from '../utils/validation';
import { getErrorMessage } from '../utils/errors';
import type { RootStackScreenProps } from '../types/navigation';
import type { Expense, ExpenseCategory } from '../types/models';
import { colors, palette, radius } from '../theme';

type Props = RootStackScreenProps<'Expenses'>;

const PAGE_LIMIT = 20;

const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fromIsoDay = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const blankForm = (): ExpenseFormValues => ({
  title: '', category: 'other', amount: '', expenseDate: isoDay(new Date()), paymentMethod: '', notes: ''
});

// ─── Add / edit sheet ─────────────────────────────────────────────────────────

interface ExpenseSheetProps {
  visible: boolean;
  editing: Expense | null;
  onClose: () => void;
  onSave: (values: ExpenseFormOutput) => Promise<void>;
}

function ExpenseSheet({ visible, editing, onClose, onSave }: ExpenseSheetProps) {
  const { locale } = useGarage();
  const [showCalendar, setShowCalendar] = useState(false);
  const {
    control, handleSubmit, reset, watch, setValue,
    formState: { isSubmitting, errors },
  } = useForm<ExpenseFormValues, unknown, ExpenseFormOutput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: blankForm(),
  });
  const expenseDate = watch('expenseDate');

  useEffect(() => {
    if (!visible) return;
    reset(editing ? {
      title: editing.title,
      category: editing.category,
      amount: String(editing.amount),
      expenseDate: editing.expenseDate.slice(0, 10),
      paymentMethod: editing.paymentMethod,
      notes: editing.notes || '',
    } : blankForm());
  }, [visible, editing, reset]);

  const handleSave = async (values: ExpenseFormOutput) => {
    try {
      await onSave(values);
      onClose();
    } catch (e) {
      Toast.show({ type: 'error', text1: getErrorMessage(e, 'Failed to save expense') });
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={editing ? 'Edit Expense' : 'Add Expense'}
      maxHeight="92%"
      testID="expense-sheet"
      footer={
        <SheetActions
          onCancel={onClose}
          onConfirm={handleSubmit(handleSave)}
          confirmLabel={editing ? 'Save Changes' : 'Record Expense'}
          loading={isSubmitting}
          testID="expense-save"
        />
      }
    >
      <ControlledField control={control} name="title" label="Title" placeholder="What was it for" required testID="expense-title" />
      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <ControlledField control={control} name="amount" label={`Amount (${locale.currency})`} placeholder="0.00" keyboardType="decimal-pad" required testID="expense-amount" />
        </View>
        <View style={{ width: 12 }} />
        <View style={{ flex: 1 }}>
          <Text style={s.label}>Date *</Text>
          <TouchableOpacity style={[s.dateTrigger, !!errors.expenseDate && s.dateTriggerError]} onPress={() => setShowCalendar(true)} activeOpacity={0.7} testID="expense-date">
            <Ionicons name="calendar-outline" size={16} color={colors.textStrong} />
            <Text style={s.dateText}>
              {typeof expenseDate === 'string' && expenseDate
                ? formatDate(fromIsoDay(expenseDate), locale, { day: '2-digit', month: 'short', year: 'numeric' })
                : 'Select date'}
            </Text>
          </TouchableOpacity>
          {errors.expenseDate && <Text style={s.errorText}>{errors.expenseDate.message}</Text>}
        </View>
      </View>
      <ControlledPicker control={control} name="category" label="Category" options={EXPENSE_CATEGORY_OPTIONS} required />
      <ControlledPicker control={control} name="paymentMethod" label="Paid via" options={EXPENSE_PAYMENT_METHOD_OPTIONS} />
      <ControlledField control={control} name="notes" label="Notes" placeholder="Optional" />

      <CalendarModal
        visible={showCalendar}
        selected={typeof expenseDate === 'string' && expenseDate ? fromIsoDay(expenseDate) : null}
        disable="future"
        onSelect={d => { setValue('expenseDate', isoDay(d), { shouldValidate: true }); setShowCalendar(false); }}
        onClose={() => setShowCalendar(false)}
      />
    </BottomSheet>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

/**
 * Money going out, one month at a time. Reached from More; owner and admin
 * only (the API refuses everyone else). The month's total comes from the
 * API with the rows so the header and the list can never disagree.
 */
export default function ExpensesScreen(_props: Props) {
  const { activeGarageId, locale } = useGarage();
  const { withLoader } = useGlobalLoader();
  const [month, setMonth] = useState(currentMonthKey());
  // Stepping through several months is one request, for the month the taps end on.
  const debouncedMonth = useDebounce(month, 350);
  const [category, setCategory] = useState<ExpenseCategory | ''>('');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  // A slow response for an earlier filter must not land on top of a later one.
  const requestSeq = useRef(0);

  const fetchExpenses = useCallback(async (currentPage = 1, refresh = false) => {
    const seq = ++requestSeq.current;
    if (refresh) setRefreshing(true);
    try {
      const res = await getExpenses({ month: debouncedMonth, category: category || undefined, page: currentPage, limit: PAGE_LIMIT });
      if (seq !== requestSeq.current) return;
      setExpenses(prev => currentPage === 1 ? res.data : [...prev, ...res.data]);
      setTotalAmount(res.totalAmount);
      setHasMore(res.data.length === PAGE_LIMIT);
    } catch {
      if (seq === requestSeq.current) Toast.show({ type: 'error', text1: 'Failed to load expenses' });
    } finally {
      if (seq === requestSeq.current) { setLoading(false); setRefreshing(false); }
    }
  }, [debouncedMonth, category]);

  useEffect(() => { setPage(1); setLoading(true); fetchExpenses(1); }, [fetchExpenses, activeGarageId]);

  const loadMore = () => {
    if (!hasMore || loading || refreshing) return;
    const next = page + 1;
    setPage(next);
    fetchExpenses(next);
  };

  const openAdd = () => { setEditing(null); setSheetVisible(true); };
  const openEdit = (expense: Expense) => { setEditing(expense); setSheetVisible(true); };

  const handleSave = async (values: ExpenseFormOutput) => {
    await withLoader(async () => {
      if (editing) {
        await updateExpense(editing._id, values);
        Toast.show({ type: 'success', text1: 'Expense updated' });
      } else {
        await createExpense(values);
        Toast.show({ type: 'success', text1: 'Expense recorded' });
      }
      setPage(1);
      await fetchExpenses(1);
    }, editing ? 'Saving expense...' : 'Recording expense...');
  };

  const handleDelete = (expense: Expense) => {
    Alert.alert(
      'Delete expense?',
      `${expense.title} (${formatMoney(expense.amount, locale)}) will be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: () => withLoader(async () => {
            try {
              await deleteExpense(expense._id);
              Toast.show({ type: 'success', text1: 'Expense deleted' });
              setPage(1);
              await fetchExpenses(1);
            } catch (e) {
              Toast.show({ type: 'error', text1: getErrorMessage(e, 'Failed to delete expense') });
            }
          }, 'Deleting expense...')
        }
      ]
    );
  };

  const renderItem: ListRenderItem<Expense> = useCallback(({ item }) => (
    <TouchableOpacity style={s.card} onPress={() => openEdit(item)} activeOpacity={0.8} testID={`expense-${item._id}`}>
      <View style={s.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={s.title} numberOfLines={1}>{item.title}</Text>
          <Text style={s.meta}>
            {formatDate(item.expenseDate, locale, { day: '2-digit', month: 'short' })}
            {item.paymentMethod ? ` - ${item.paymentMethod.replace('_', ' ')}` : ''}
          </Text>
        </View>
        <Text style={s.amount}>{formatMoney(item.amount, locale)}</Text>
      </View>
      <View style={s.cardBottom}>
        <View style={s.chip}><Text style={s.chipText}>{EXPENSE_CATEGORY_LABEL[item.category] || item.category}</Text></View>
        <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel={`Delete ${item.title}`} testID={`delete-${item._id}`}>
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [locale]);

  return (
    <ResponsiveScreen>
      <View style={s.container}>
        <View style={s.toolbar}>
          <MonthStepper value={month} onChange={setMonth} locale={locale.locale} />
        </View>
        <View style={s.filterRow}>
          <BottomSheetPicker
            options={[{ value: '', label: 'All categories' }, ...EXPENSE_CATEGORY_OPTIONS]}
            selectedValue={category}
            onValueChange={v => setCategory(v as ExpenseCategory | '')}
            placeholder="All categories"
          />
        </View>

        <View style={s.totalCard} testID="month-total">
          <View style={s.totalIcon}><Ionicons name="wallet-outline" size={20} color={colors.danger} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.totalLabel}>{category ? 'Total of matching expenses' : 'Total spent this month'}</Text>
            <Text style={s.totalValue}>{formatMoney(totalAmount, locale)}</Text>
          </View>
        </View>

        {loading && page === 1 ? (
          <View style={s.loading}><ActivityIndicator size="large" color={colors.primary} /></View>
        ) : (
          <FlatList
            data={expenses}
            keyExtractor={item => item._id}
            renderItem={renderItem}
            contentContainerStyle={s.list}
            refreshing={refreshing}
            onRefresh={() => { setPage(1); fetchExpenses(1, true); }}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={
              <View style={s.empty}>
                <Ionicons name="wallet-outline" size={48} color={colors.borderStrong} />
                <Text style={s.emptyText}>No expenses recorded</Text>
                <Text style={s.emptyHint}>
                  {category ? 'Try a different category' : 'Record rent, parts and salaries to see this month\'s profit on the Dashboard.'}
                </Text>
              </View>
            }
          />
        )}

        <TouchableOpacity style={s.fab} onPress={openAdd} testID="add-expense-fab" accessibilityLabel="Add expense">
          <Ionicons name="add" size={28} color={colors.textOnPrimary} />
        </TouchableOpacity>

        <ExpenseSheet visible={sheetVisible} editing={editing} onClose={() => setSheetVisible(false)} onSave={handleSave} />
      </View>
    </ResponsiveScreen>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  toolbar: { paddingHorizontal: 16, paddingTop: 12 },
  filterRow: { paddingHorizontal: 16, paddingTop: 8 },
  totalCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginTop: 8, marginBottom: 4,
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14,
    shadowColor: colors.shadowAmbient, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  totalIcon: { width: 40, height: 40, borderRadius: radius.lg, backgroundColor: colors.dangerSoft, alignItems: 'center', justifyContent: 'center' },
  totalLabel: { fontSize: 12, color: colors.textMuted },
  totalValue: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginTop: 2 },
  list: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, marginBottom: 10,
    shadowColor: colors.shadowAmbient, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  title: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2, textTransform: 'capitalize' },
  amount: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  chip: { backgroundColor: colors.surfaceMuted, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', marginTop: 40, paddingHorizontal: 24 },
  emptyText: { marginTop: 12, fontSize: 16, color: colors.textMuted },
  emptyHint: { marginTop: 4, fontSize: 13, color: colors.textFaint, textAlign: 'center', lineHeight: 18 },
  fab: {
    position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: radius.xxl,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
    shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  row: { flexDirection: 'row' },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 },
  dateTrigger: {
    flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, paddingHorizontal: 12,
    borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, backgroundColor: colors.surface,
  },
  dateTriggerError: { borderColor: colors.danger },
  dateText: { fontSize: 14, color: colors.textStrong, flex: 1 },
  errorText: { fontSize: 12, color: palette.red700, marginTop: 4 },
});
