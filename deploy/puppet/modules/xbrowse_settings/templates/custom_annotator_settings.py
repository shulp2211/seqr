import pymongo

db = pymongo.Connection()['x_custom_annots']

reference_data_dir = '<%= raw_data_dir %>/'
dbsnp_vcf_file = reference_data_dir + '00-All.vcf'
dbnsfp_dir = reference_data_dir + 'dbNSFP/'
#esp_target_file = reference_data_dir + 'esp_target.interval_list'

