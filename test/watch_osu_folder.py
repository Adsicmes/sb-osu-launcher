from watchfiles import watch
from rich import print
for changes in watch(r'D:\UserFiles\Games\OSU\stable'):
    for change in changes:

        print(change)
