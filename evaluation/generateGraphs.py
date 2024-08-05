import matplotlib.pyplot as plt
import pandas as pd

new_zkp_file_path = './evaluation/ZKP_performance_data.csv'
new_he_file_path = './evaluation/HE_performance_data.csv'

new_zkp_data = pd.read_csv(new_zkp_file_path)
new_he_data = pd.read_csv(new_he_file_path)

new_zkp_data_head = new_zkp_data.head()
new_he_data_head = new_he_data.head()

# Extract relevant columns for comparison
new_zkp_metrics = new_zkp_data[
    ['generateZKPCPU', 'generateZKPMemory', 'generateZKPDuration', 'verifyZKPCPU', 'verifyZKPMemory',
     'verifyZKPDuration']]
new_he_metrics = new_he_data[['companySetupCPU', 'companySetupMemory', 'companySetupDuration',
                              'studentMainCPU', 'studentMainMemory', 'studentMainDuration',
                              'companyMainCPU', 'companyMainMemory', 'companyMainDuration']]

# Rename columns for better comparison
new_zkp_metrics.columns = ['GenCPU', 'GenMemory', 'GenDuration', 'VerCPU', 'VerMemory', 'VerDuration']
new_he_metrics.columns = ['SetupCPU', 'SetupMemory', 'SetupDuration',
                          'CalculationCPU', 'CalculationMemory', 'CalculationDuration',
                          'VerificationCPU', 'VerificationMemory', 'VerificationDuration']

# CPU Usage Comparison
plt.figure(figsize=(10, 6))
plt.boxplot([new_zkp_metrics['GenCPU'], new_zkp_metrics['VerCPU'], new_he_metrics['SetupCPU'],
             new_he_metrics['CalculationCPU'], new_he_metrics['VerificationCPU']],
            labels=['ZKP Gen CPU', 'ZKP Ver CPU', 'HE Setup CPU',
                    'HE Calc CPU', 'HE Ver CPU'])

plt.title('CPU Usage Comparison')
plt.ylabel('CPU Usage (%)')
plt.tight_layout()
plt.savefig("./evaluation/cpu_usage_comparison.png")
plt.show()


# Memory Usage Comparison
plt.figure(figsize=(10, 6))
plt.boxplot([new_zkp_metrics['GenMemory'], new_zkp_metrics['VerMemory'], new_he_metrics['SetupMemory'],
             new_he_metrics['CalculationMemory'], new_he_metrics['VerificationMemory']],
            labels=['ZKP Gen Memory', 'ZKP Ver Memory', 'HE Setup Memory',
                    'HE Calc Memory', 'HE Ver Memory'])
plt.title('Memory Usage Comparison')
plt.ylabel('Memory Usage (MB)')
plt.tight_layout()
plt.savefig("./evaluation/memory_usage_comparison.png")
plt.show()


# Duration Comparison
plt.figure(figsize=(10, 6))
plt.boxplot([new_zkp_metrics['GenDuration'], new_zkp_metrics['VerDuration'], new_he_metrics['SetupDuration'],
             new_he_metrics['CalculationDuration'], new_he_metrics['CalculationDuration']],
            labels=['ZKP Gen Duration', 'ZKP Ver Duration', 'HE Setup Duration',
                    'HE Calc Duration', 'HE Ver Duration'])
plt.title('Duration Comparison')
plt.ylabel('Duration (ms)')
plt.tight_layout()
plt.savefig("./evaluation/duration_comparison.png")
plt.show()

