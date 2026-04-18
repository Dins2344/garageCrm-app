import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { getCustomers, createCustomer } from '../api/customerService';
import { createVehicle } from '../api/vehicleService';
import { getMechanics, getAdvisors } from '../api/userService';
import { createJobCard } from '../api/jobCardService';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

export default function CreateJobCardScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Data
  const [customers, setCustomers] = useState([]);
  const [mechanics, setMechanics] = useState([]);
  const [advisors, setAdvisors] = useState([]);

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  const [licensePlate, setLicensePlate] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  
  const [serviceType, setServiceType] = useState('service');
  const [advisorId, setAdvisorId] = useState('');
  const [mechanicId, setMechanicId] = useState('');
  const [complaint, setComplaint] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
       getMechanics().then(setMechanics).catch(()=>{});
       getAdvisors().then(setAdvisors).catch(()=>{});
    } catch(e) {}
  };

  const handleNext = () => {
    if (!customerName || !customerPhone || !licensePlate || !make || !model) {
      Toast.show({ type: 'error', text1: 'Fill all required Customer/Vehicle fields' });
      return;
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!advisorId) {
      Toast.show({ type: 'error', text1: 'Please assign a Service Advisor' });
      return;
    }
    setLoading(true);
    
    try {
      // 1. Create Customer
      const { data: custData } = await createCustomer({ name: customerName, phone: customerPhone });
      const customerId = custData._id;

      // 2. Create Vehicle
      const { data: vehData } = await createVehicle({ 
        licensePlate: licensePlate.toUpperCase(), 
        make, 
        model, 
        customer: customerId 
      });
      const vehicleId = vehData._id;

      // 3. Create Job Card
      const jobCardData = {
        serviceType,
        vehicle: vehicleId,
        customer: customerId,
        assignedAdvisor: advisorId || undefined,
        assignedMechanic: mechanicId || undefined,
        complaints: complaint ? [{ description: complaint, priority: 'medium' }] : []
      };

      await createJobCard(jobCardData);
      Toast.show({ type: 'success', text1: 'Job Card Created!' });
      navigation.goBack();
      
    } catch (error) {
      Toast.show({ type: 'error', text1: error.response?.data?.message || 'Failed to create Job Card' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="close" size={26} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Job Card</Text>
        <View style={{width: 26}}/>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Step Indicator */}
        <View style={styles.stepContainer}>
           <View style={[styles.stepItem, step === 1 ? styles.stepActive : styles.stepInactive]}>
             <Text style={[styles.stepText, step === 1 ? styles.stepTextActive : null]}>1. Customer</Text>
           </View>
           <View style={[styles.stepItem, step === 2 ? styles.stepActive : styles.stepInactive]}>
             <Text style={[styles.stepText, step === 2 ? styles.stepTextActive : null]}>2. Work Details</Text>
           </View>
        </View>

        {step === 1 ? (
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Customer Info</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name *</Text>
              <TextInput style={styles.input} value={customerName} onChangeText={setCustomerName} placeholder="John Doe" />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone *</Text>
              <TextInput style={styles.input} value={customerPhone} onChangeText={setCustomerPhone} placeholder="9876543210" keyboardType="phone-pad" />
            </View>
            
            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>Vehicle Info</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>License Plate *</Text>
              <TextInput style={styles.input} value={licensePlate} onChangeText={setLicensePlate} placeholder="KA01AB1234" autoCapitalize="characters" />
            </View>
            <View style={{flexDirection: 'row', gap: 12}}>
              <View style={[styles.inputGroup, {flex: 1}]}>
                <Text style={styles.label}>Make *</Text>
                <TextInput style={styles.input} value={make} onChangeText={setMake} placeholder="Honda" />
              </View>
              <View style={[styles.inputGroup, {flex: 1}]}>
                <Text style={styles.label}>Model *</Text>
                <TextInput style={styles.input} value={model} onChangeText={setModel} placeholder="City" />
              </View>
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
              <Text style={styles.primaryButtonText}>Next: Work Details</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Service Details</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Service Type *</Text>
              <View style={styles.pickerContainer}>
                <Picker selectedValue={serviceType} onValueChange={setServiceType}>
                  <Picker.Item label="Periodic Service" value="service" />
                  <Picker.Item label="General Repair" value="repair" />
                  <Picker.Item label="Accident Repair" value="accident" />
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Service Advisor *</Text>
              <View style={styles.pickerContainer}>
                <Picker selectedValue={advisorId} onValueChange={setAdvisorId}>
                  <Picker.Item label="Select Advisor..." value="" />
                  {advisors.map(a => <Picker.Item key={a._id} label={a.name} value={a._id} />)}
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Assign Mechanic (Optional)</Text>
              <View style={styles.pickerContainer}>
                <Picker selectedValue={mechanicId} onValueChange={setMechanicId}>
                  <Picker.Item label="Unassigned" value="" />
                  {mechanics.map(m => <Picker.Item key={m._id} label={m.name} value={m._id} />)}
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Primary Complaint</Text>
              <TextInput 
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
                value={complaint} 
                onChangeText={setComplaint} 
                multiline 
                placeholder="Describe issue..." 
              />
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(1)} disabled={loading}>
                <Text style={styles.secondaryButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryButton, {flex: 2, marginTop: 0}]} onPress={handleSubmit} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Create Job Card</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  stepContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 4,
  },
  stepItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  stepActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  stepInactive: {
    backgroundColor: 'transparent',
  },
  stepText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  stepTextActive: {
    color: '#3b5ff8',
  },
  formSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1f2937',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 20,
  },
  primaryButton: {
    backgroundColor: '#3b5ff8',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  secondaryButtonText: {
    color: '#4b5563',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
