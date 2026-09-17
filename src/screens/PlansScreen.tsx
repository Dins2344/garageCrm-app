import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useGarage } from '../context/GarageContext';
import { getPlans } from '../api/metaService';
import ResponsiveScreen from '../components/ResponsiveScreen';
import { Skeleton } from '../components/Skeleton';
import { formatMoney } from '../utils/format';
import type { RootStackScreenProps } from '../types/navigation';
import type { PlanCatalog, PlanCatalogEntry, PlanId } from '../types/models';
import { colors, palette, radius } from '../theme';

type Props = RootStackScreenProps<'Plans'>;

/**
 * Read-only plan listing, reached from the Plans tile on Settings.
 *
 * Everything shown comes from `GET /meta/plans`: the matrix, the prices in
 * the garage's currency and whether purchasing is open. It is not — every
 * owner is on Free — so this screen carries the server's notice and no
 * button that leads to a payment. That is deliberate beyond "not built yet":
 * Google Play forbids steering to an outside checkout from inside the app,
 * so when paid plans launch the purchase still happens on the web and this
 * screen stays a listing (docs/subscriptions-and-payments-plan.md, section 4).
 */
export default function PlansScreen(_props: Props) {
  const { locale } = useGarage();
  const [catalog, setCatalog] = useState<PlanCatalog | null>(null);
  const [loading, setLoading] = useState(true);

  // Until subscriptions exist, every account is on Free.
  const currentPlan: PlanId = 'free';

  useEffect(() => {
    let cancelled = false;
    getPlans(locale.country)
      .then(res => { if (!cancelled) setCatalog(res.data); })
      .catch(() => { if (!cancelled) Toast.show({ type: 'error', text1: 'Could not load plans' }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [locale.country]);

  return (
    <ResponsiveScreen>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {loading ? (
          <PlansSkeleton />
        ) : !catalog ? (
          <Text style={styles.empty}>Plans are not available right now.</Text>
        ) : (
          <>
            {!catalog.purchasing.enabled && (
              <View style={styles.notice} testID="coming-soon">
                <Ionicons name="time-outline" size={20} color={palette.amber800} />
                <View style={styles.noticeBody}>
                  <Text style={styles.noticeTitle}>Paid plans are coming soon</Text>
                  <Text style={styles.noticeText}>{catalog.purchasing.message}</Text>
                </View>
              </View>
            )}

            {catalog.plans.map(plan => (
              <PlanCard
                key={plan.id}
                plan={plan}
                current={plan.id === currentPlan}
                money={{ locale: locale.locale, currency: catalog.currency }}
              />
            ))}

            <Text style={styles.footnote}>
              Prices are shown in {catalog.currency}. Annual billing is ten months for the price of twelve.
            </Text>
          </>
        )}
      </ScrollView>
    </ResponsiveScreen>
  );
}

function PlanCard({ plan, current, money }: {
  plan: PlanCatalogEntry;
  current: boolean;
  money: { locale: string; currency: string };
}) {
  const highlighted = plan.id === 'plus';
  return (
    <View style={[styles.card, highlighted && styles.cardHighlighted]} testID={`plan-${plan.id}`}>
      <View style={styles.cardHeader}>
        <Text style={styles.planName}>{plan.name}</Text>
        {current ? (
          <View style={[styles.badge, styles.badgeCurrent]}>
            <Text style={[styles.badgeText, styles.badgeTextCurrent]}>Current plan</Text>
          </View>
        ) : highlighted ? (
          <View style={[styles.badge, styles.badgePopular]}>
            <Text style={[styles.badgeText, styles.badgeTextPopular]}>Popular</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.tagline}>{plan.tagline}</Text>

      {plan.price.monthly === 0 ? (
        <Text style={styles.price}>Free</Text>
      ) : (
        <View>
          <Text style={styles.price}>
            {formatMoney(plan.price.monthly, money)}
            <Text style={styles.pricePeriod}> / month</Text>
          </Text>
          <Text style={styles.priceAnnual}>
            or {formatMoney(plan.price.annual, money)} a year
          </Text>
        </View>
      )}

      <View style={styles.features}>
        {plan.features.map(feature => (
          <View key={feature} style={styles.feature}>
            <Ionicons name="checkmark" size={16} color={palette.emerald700} />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function PlansSkeleton() {
  return (
    <View testID="plans-skeleton">
      <View style={styles.notice}>
        <Skeleton width="80%" height={14} />
      </View>
      {[0, 1, 2].map(i => (
        <View key={i} style={styles.card}>
          <Skeleton width={72} height={18} />
          <Skeleton width="60%" height={12} style={{ marginTop: 10 }} />
          <Skeleton width={120} height={26} style={{ marginTop: 16 }} />
          <Skeleton width="90%" height={12} style={{ marginTop: 16 }} />
          <Skeleton width="75%" height={12} style={{ marginTop: 8 }} />
          <Skeleton width="85%" height={12} style={{ marginTop: 8 }} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 32 },
  empty: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 32 },
  notice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: colors.warningSoft, borderWidth: 1, borderColor: colors.warning,
    borderRadius: radius.lg, padding: 14, marginBottom: 16
  },
  noticeBody: { flex: 1 },
  noticeTitle: { fontSize: 14, fontWeight: '700', color: palette.amber800 },
  noticeText: { fontSize: 13, color: palette.amber800, lineHeight: 18, marginTop: 2 },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: colors.shadowAmbient, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4
  },
  cardHighlighted: { borderColor: colors.primary },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planName: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  tagline: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  price: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, marginTop: 14 },
  pricePeriod: { fontSize: 13, fontWeight: '500', color: colors.textMuted },
  priceAnnual: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  features: { marginTop: 14, gap: 8 },
  feature: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  featureText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.xs, borderWidth: 1 },
  badgeCurrent: { backgroundColor: colors.successSoft, borderColor: colors.success },
  badgePopular: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  badgeText: { fontSize: 11, fontWeight: '700' },
  badgeTextCurrent: { color: palette.emerald700 },
  badgeTextPopular: { color: colors.primary },
  footnote: { fontSize: 12, color: colors.textFaint, lineHeight: 18, marginTop: 4 }
});
