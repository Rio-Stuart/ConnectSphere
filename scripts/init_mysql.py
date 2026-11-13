import os
import shutil
import subprocess

data_dir = os.path.abspath('mysql_data')
if os.path.exists(data_dir):
    shutil.rmtree(data_dir, ignore_errors=True)
os.makedirs(data_dir, exist_ok=True)

mysqld_path = r'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe'

cmd = [
    mysqld_path,
    f'--datadir={data_dir}',
    '--initialize-insecure',
    '--console'
]

print("Running:", " ".join(cmd))
res = subprocess.run(cmd, capture_output=True, text=True)
print("STDOUT:", res.stdout)
print("STDERR:", res.stderr)
print("Exit code:", res.returncode)
