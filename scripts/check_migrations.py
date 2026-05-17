import os

versions_dir = 'alembic/versions'
files = sorted(os.listdir(versions_dir))
for f in files:
    if f.endswith('.py') and not f.startswith('__'):
        content = open(os.path.join(versions_dir, f), encoding='utf-8').read()
        rev = [l for l in content.split('\n') if 'revision:' in l and 'str' in l]
        down = [l for l in content.split('\n') if 'down_revision' in l and '=' in l]
        r = rev[0].strip() if rev else '?'
        d = down[0].strip() if down else '?'
        print(f"{f[:45]:<47} {r}")
        print(f"{'':47} {d}")
        print()
