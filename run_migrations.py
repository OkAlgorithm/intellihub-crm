"""
Migration runner - runs all SQL migrations in order
"""
import psycopg2
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()


def run_migrations():
    """Run all migration files in order"""

    # Connect to database
    conn = psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
        database=os.getenv("DB_NAME", "crm_db"),
        user=os.getenv("DB_USER", "zhanik"),
        password=os.getenv("DB_PASSWORD", ""),
    )

    cursor = conn.cursor()

    # Get all migration files sorted by name
    migrations_dir = Path("supabase/migrations")
    migration_files = sorted(migrations_dir.glob("*.sql"))

    print(f"Found {len(migration_files)} migration files")

    for migration_file in migration_files:
        print(f"\nRunning: {migration_file.name}")

        try:
            # Read and execute SQL
            with open(migration_file, 'r') as f:
                sql = f.read()

            cursor.execute(sql)
            conn.commit()
            print(f"✓ Success: {migration_file.name}")

        except Exception as e:
            print(f"✗ Error in {migration_file.name}: {e}")
            conn.rollback()

            # Ask if we should continue
            response = input("Continue with next migration? (y/n): ")
            if response.lower() != 'y':
                break

    cursor.close()
    conn.close()
    print("\n✓ Migrations complete!")


if __name__ == "__main__":
    try:
        run_migrations()
    except Exception as e:
        print(f"Failed to run migrations: {e}")
        print("\nMake sure:")
        print("1. PostgreSQL is running")
        print("2. Database exists (run: createdb crm_db)")
        print("3. .env file has correct DB credentials")