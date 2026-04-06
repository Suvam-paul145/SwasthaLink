import traceback

try:
    pass
except Exception:
    with open('error3.log', 'w', encoding='utf-8') as f:
        f.write(traceback.format_exc())
