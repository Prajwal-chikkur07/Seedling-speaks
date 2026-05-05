import subprocess

def get_git_file(commit, path):
    try:
        content = subprocess.check_output(['git', 'show', f'{commit}:{path}']).decode('utf-8')
        with open(f'{commit}_overlay.html', 'w') as f:
            f.write(content)
    except Exception as e:
        print(f"Failed for {commit}: {e}")

get_git_file('HEAD~1', 'desktop-widget/overlay.html')
get_git_file('HEAD~2', 'desktop-widget/overlay.html')
get_git_file('HEAD~3', 'desktop-widget/overlay.html')
