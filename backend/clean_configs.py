import os
files = ['railway.json', 'nixpacks.toml', 'Procfile']
for f in files:
    try:
        os.remove(f)
        print(f"Removed {f}")
    except Exception as e:
        print(f"Failed to remove {f}: {e}")
