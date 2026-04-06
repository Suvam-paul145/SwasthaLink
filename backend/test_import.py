import traceback
import sys

try:
    import main
except Exception as e:
    with open('error3.log', 'w', encoding='utf-8') as f:
        f.write(traceback.format_exc())
