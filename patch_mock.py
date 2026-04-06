import os

def update_supabase_service():
    path = "backend/db/supabase_service.py"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Replace the initialization
    old_init = "supabase_client = MockSupabaseClient()"
    new_init = '''if SUPABASE_SDK_AVAILABLE and SUPABASE_URL and SUPABASE_KEY:
    supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
    logger.info("Real Supabase client initialized successfully")
else:
    logger.error("Real Supabase credentials missing. SDK or keys are not available.")
    supabase_client = None'''
    
    content = content.replace(old_init, new_init)
    
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
        
def update_auth_service():
    path = "backend/auth/auth_service.py"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
        
    content = content.replace(
        "from db.mock_supabase import MockSupabaseClient",
        "from db.supabase_service import supabase_client"
    )
    content = content.replace(
        "supabase_client = MockSupabaseClient()",
        "# supabase_client imported from supabase_service"
    )
    
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

if __name__ == "__main__":
    update_supabase_service()
    update_auth_service()
    print("Updates complete.")
