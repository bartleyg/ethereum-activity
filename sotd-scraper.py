import requests
import json
import time

HEADERS = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36'}
URL_BASE = 'https://api.stateofthedapps.com/dapps?limit=100&order=asc&sort=rank&offset='
URL_CONTRACT = 'https://api.stateofthedapps.com/dapps/'

offset = 0
allDapps = []

# make first call to get total number of dapps
req = requests.get(URL_BASE + str(offset), headers=HEADERS).json()
total = req['pager']['totalCount']

# make calls 100 at a time building list of dapp data
while offset < total:
    print('fetching from offset', offset)
    req = requests.get(URL_BASE + str(offset), headers=HEADERS).json()
    allDapps += req['items'] # merge list
    offset += 100
    time.sleep(0.1) # 100 ms wait to not hammer site

store = {} # contract address is key
for item in allDapps:
    print('fetching', item['slug'])
    r = requests.get(URL_CONTRACT + item['slug'], headers=HEADERS).json()
    try:
        address = r['item']['contractsMainnet'][0]
        item['name']
        item['iconUrl']
    except:
        print(item['slug'], 'has no mainnet contract')
        time.sleep(0.1)
        continue
    if item['name'] is '' or item['iconUrl'] is '':
        print(item['slug'], 'is missing info')
        time.sleep(0.1)
        continue
    store[address] = {}
    store[address]['name'] = item['name']
    store[address]['iconUrl'] = item['iconUrl']
    time.sleep(0.1) # 100 ms wait to not hammer site

print('Got data on', len(store), 'dapps')
json.dump(store, open('dapps.json', 'w'))
