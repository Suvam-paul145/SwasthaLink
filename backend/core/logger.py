import logging
import json
import time
from datetime import datetime, timezone
import uuid

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_record = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "name": record.name,
            "message": record.getMessage(),
        }
        
        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)
            
        if hasattr(record, "request_id"):
            log_record["request_id"] = record.request_id
            
        # Standard attributes of LogRecord to exclude
        exclude_fields = {
            "args", "asctime", "created", "exc_info", "exc_text", "filename", 
            "funcName", "levelname", "levelno", "lineno", "module", "msecs", 
            "message", "msg", "name", "pathname", "process", "processName", 
            "relativeCreated", "stack_info", "thread", "threadName", "taskName",
            "request_id"  # explicitly handled
        }
        
        # Add any extra attributes passed via 'extra'
        for key, value in record.__dict__.items():
            if key not in exclude_fields and not key.startswith("_"):
                log_record[key] = value

        return json.dumps(log_record)

def setup_logger(name: str = __name__) -> logging.Logger:
    logger = logging.getLogger(name)
    
    if not logger.handlers:
        handler = logging.StreamHandler()
        formatter = JSONFormatter()
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
        logger.propagate = False
        
    return logger
