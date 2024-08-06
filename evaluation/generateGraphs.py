import matplotlib.pyplot as plt
import pandas as pd
import numpy as np

new_zkp_file_path = './evaluation/ZKP_performance_data.csv'
new_he_file_path = './evaluation/HE_performance_data.csv'

new_zkp_data = pd.read_csv(new_zkp_file_path)
new_he_data = pd.read_csv(new_he_file_path)

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

x_labels = ['ZKP Generation', 'ZKP Verification', 'HE Setup', 'HE Calculation', 'HE Verification']


def filter_non_zero(data):
    return [value for value in data if value > 0]


def plot_comparison(data, labels, title, y_label, filename):
    fig, ax = plt.subplots(figsize=(10, 8))

    # Adjust flierprops to fill the outlier dots with blue and make them smaller
    flierprops = dict(marker='o', color='blue', markersize=4, markerfacecolor='blue')
    ax.boxplot(data, labels=labels, flierprops=flierprops)

    ax.set_title(title)
    ax.set_ylabel(y_label)
    ax.set_ylim(bottom=0)
    ax.grid(axis='y', linestyle=':', linewidth=0.5)  # Add dotted horizontal grid lines

    # Increase the number of y-axis ticks
    y_ticks = ax.get_yticks()
    new_y_ticks = []
    for i in range(1, len(y_ticks)):
        new_y_ticks.append(y_ticks[i - 1])
        new_y_ticks.append((y_ticks[i - 1] + y_ticks[i]) / 2)
    new_y_ticks.append(y_ticks[-1])
    ax.set_yticks(new_y_ticks)

    # Calculate statistics
    max_vals = [np.max(d) for d in data]
    avg_vals = [np.mean(d) for d in data]
    med_vals = [np.median(d) for d in data]
    min_vals = [np.min(d) for d in data]

    # Create the table
    table_data = [
        ["MAX"] + [f"{val:.2f}" for val in max_vals],
        ["AVG"] + [f"{val:.2f}" for val in avg_vals],
        ["MEDIAN"] + [f"{val:.2f}" for val in med_vals],
        ["MIN"] + [f"{val:.2f}" for val in min_vals],
    ]

    n_columns = len(labels) + 1
    col_widths = [0.09] + [0.91 / (n_columns - 1)] * (n_columns - 1)  # Adjust column widths

    table = plt.table(cellText=table_data, loc='bottom', cellLoc='center',
                      colWidths=col_widths, bbox=[-0.1, -0.35, 1.1, 0.28])
    table.auto_set_font_size(False)
    table.set_fontsize(10)

    # Set the borderlines to be thinner
    for key, cell in table.get_celld().items():
        cell.set_linewidth(0.5)

    plt.subplots_adjust(left=0.2, bottom=0.4)
    plt.tight_layout(rect=[0.02, 0.1, 1, 0.95])
    plt.savefig(f"./evaluation/{filename}.png")
    plt.show()


# CPU Usage Comparison (filter out 0 values)
plot_comparison(
    [filter_non_zero(new_zkp_metrics['GenCPU']), filter_non_zero(new_zkp_metrics['VerCPU']),
     filter_non_zero(new_he_metrics['SetupCPU']), filter_non_zero(new_he_metrics['CalculationCPU']),
     filter_non_zero(new_he_metrics['VerificationCPU'])],
    x_labels,
    'CPU Usage Comparison',
    'CPU Usage (%)',
    'cpu_usage_comparison'
)
#
# # Memory Usage Comparison
# plot_comparison(
#     [new_zkp_metrics['GenMemory'], new_zkp_metrics['VerMemory'], new_he_metrics['SetupMemory'],
#      new_he_metrics['CalculationMemory'], new_he_metrics['VerificationMemory']],
#     x_labels,
#     'Memory Usage Comparison',
#     'Memory Usage (MB)',
#     'memory_usage_comparison'
# )
#
# # Duration Comparison
# plot_comparison(
#     [new_zkp_metrics['GenDuration'], new_zkp_metrics['VerDuration'], new_he_metrics['SetupDuration'],
#      new_he_metrics['CalculationDuration'], new_he_metrics['VerificationDuration']],
#     x_labels,
#     'Duration Comparison',
#     'Duration (ms)',
#     'duration_comparison'
# )
