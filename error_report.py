import traceback
import os

def log_error(error, context=None):
    report_path = os.path.join(os.path.dirname(__file__), 'error_report.txt')
    with open(report_path, 'a', encoding='utf-8') as f:
        f.write('\n--- ERROR REPORT ---\n')
        if context:
            f.write(f'Context: {context}\n')
        f.write(f'Error: {str(error)}\n')
        f.write(traceback.format_exc())
        f.write('\n')

def wrap_with_error_report(func):
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            log_error(e, context=func.__name__)
            raise
    return wrapper
