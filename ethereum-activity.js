/*
Ethereum Activity
Logic:
1. get account from metamask
2. get transactions for account from etherscan
3. parse transactions for known dapp addresses
4. get name and image of known dapps in transactions
5. compute running stats for account and dapps
*/
var matches         // where to store known transaction matches
var normalTxDone    // state variables to know when all data is ready to render
var internalTxDone  // state variables to know when all data is ready to render
var contractsCreated
var numSends
var gasPriceRunningSum
var maxGasPrice
var gasSpent

function startApp() {
  var userAccount
  // function runs every 1 sec
  var accountInterval = setInterval(function() {
    // check if metamask account has changed
    web3.eth.getAccounts().then(function(accounts) {
      if (accounts[0] !== userAccount) {
        console.log('new userAccount', userAccount)
        userAccount = accounts[0]
        matches = new Object
        normalTxDone = false
        internalTxDone = false
        accountAge = 0
        contractsCreated = 0
        numSends = 0
        gasPriceRunningSum = 0
        maxGasPrice = 0
        gasSpent = 0
        // clear any old dapp data before updating with new account
        var divDappList = document.getElementById('dappList')
        while(divDappList.firstChild){
            divDappList.removeChild(divDappList.firstChild)
        }
        updateAccount(userAccount)
      }
    })
  }, 1000); // run every 1000 ms
}

// Update address, balance, get transactions for address
function updateAccount(userAccount) {
  if (userAccount === undefined)
    document.getElementById('address').textContent = 'Please sign into MetaMask ↗️'
  else
    document.getElementById('address').textContent = userAccount

  updateAccountBalance(userAccount)
  getAccountTransactions(userAccount)
  getAccountInternalTransactions(userAccount)
}

function updateAccountBalance(userAccount) {
  web3.eth.getBalance(userAccount).then(function(balance) {
    document.getElementById('balance').textContent =
        parseFloat(web3.utils.fromWei(balance, 'ether')).toFixed(4) + ' ETH'
  });
}

function getAccountTransactions(userAccount) {
  url = 'https://api.etherscan.io/api?module=account&action=txlist&address=' +
        userAccount +
        '&sort=desc&apikey=7DS27C978SSSEUM12PEKGKFAGWDF15XH67'
  fetch(url).then(function(response) {
    return response.json()
  })
  .then(function(json) {
    return json.result
  })
  .then(function(txList) {
    makeDappsData(txList, 'normal')
  })
}

function getAccountInternalTransactions(userAccount) {
  url = 'https://api.etherscan.io/api?module=account&action=txlistinternal&address=' +
        userAccount +
        '&sort=desc&apikey=7DS27C978SSSEUM12PEKGKFAGWDF15XH67'
  fetch(url).then(function(response) {
    return response.json()
  })
  .then(function(json) {
    return json.result
  })
  .then(function(txList) {
    makeDappsData(txList, 'internal')
  })
}

// build data structure of dapp matches in account transaction
// list and compute running transaction stats on each dapp
function makeDappsData(txList, txType) {
  console.log('processing', txType, 'txList.length', txList.length)

  // go through all this addresses transactions up to max 10k by etherscan
  for (var i = 0; i < txList.length; i++) {

    // compute account age by oldest normal transaction
    if (txType === 'normal' && i === txList.length - 1)
      accountAge = Math.floor((Date.now() - parseInt(txList[i].timeStamp)*1000) / 86400000)
    // check if contract created
    if (txList[i].to === '')
      contractsCreated += 1

    // check if any known dapps match this transaction
    for (const key of Object.keys(dapps)) {

      // transaction sends to dapp
      if (key.toLowerCase() === txList[i].to) {
        numSends += 1

        if (matches[key])
          matches[key].txCount += 1
        else {
          matches[key] = {
            txCount: 1,
            rxCount: 0,
            name: dapps[key].name,
            iconUrl: dapps[key].iconUrl
          }
        }
        // ETH sent to dapp
        if (matches[key].ETHsent)
          matches[key].ETHsent += parseInt(txList[i].value)
        else
          matches[key].ETHsent = parseInt(txList[i].value)
        // Gas sent to dapp
        if (matches[key].gasSent)
          matches[key].gasSent += parseInt(txList[i].gasPrice) * parseInt(txList[i].gasUsed)
        else
          matches[key].gasSent = parseInt(txList[i].gasPrice) * parseInt(txList[i].gasUsed)
        // Account-wide gas stats
        gasSpent += parseInt(txList[i].gasPrice) * parseInt(txList[i].gasUsed)
        gasPriceRunningSum += parseInt(txList[i].gasPrice)
        if (parseInt(txList[i].gasPrice) > maxGasPrice) {
          maxGasPrice = parseInt(txList[i].gasPrice)
        }
      }

      // transaction receives from dapp
      else if (key.toLowerCase() === txList[i].from) {
        if (matches[key])
          matches[key].rxCount += 1
        else {
          matches[key] = {
            txCount: 0,
            rxCount: 1,
            name: dapps[key].name,
            iconUrl: dapps[key].iconUrl
          }
        }
        // ETH sent
        if (matches[key].ETHrecv)
          matches[key].ETHrecv += parseInt(txList[i].value)
        else
          matches[key].ETHrecv = parseInt(txList[i].value)
      }
    }
  }

  // set state variables for render to check
  if (txType === 'normal') {
    normalTxDone = true
    displayTransactions(txList.length)
  } else if (txType === 'internal')
    internalTxDone = true

  displayAccountAge(accountAge)
  displayDapps()
}

function displayAccountAge(accountAge) {
  document.getElementById('age').textContent = accountAge + ' days'
}

function displayTransactions(txListLength) {
  document.getElementById('transactions').textContent = txListLength
}

function displayContractsCreated() {
  document.getElementById('contracts').textContent = contractsCreated
}

function displayGasStats() {
  if (numSends != 0)
    avgGasPrice = parseFloat(web3.utils.fromWei(parseInt(gasPriceRunningSum / numSends).toString(), 'gwei')).toFixed(1)
  else
    avgGasPrice = 0
  maxGasPrice = parseFloat(web3.utils.fromWei(maxGasPrice.toString(), 'gwei')).toFixed(1)
  gasSpent = parseFloat(web3.utils.fromWei(gasSpent.toString(), 'ether')).toFixed(4)
  document.getElementById('avgGasPrice').textContent = avgGasPrice + ' gwei'
  document.getElementById('maxGasPrice').textContent = maxGasPrice + ' gwei'
  document.getElementById('gasSpent').textContent = gasSpent + ' ETH'
}

function displayDapps() {
  // only render if both transaction types have been processed in matches
  if (!(normalTxDone && internalTxDone))
    return

  displayContractsCreated()
  displayGasStats()

  var tbody = document.getElementById('dappList')

  for (const key of Object.keys(matches)) {
    var tr = document.createElement('div')
    tr.setAttribute('class', 'divTableRow')
    tbody.appendChild(tr)

    // dapp image cell
    var td_iconName = document.createElement('div')
    td_iconName.setAttribute('class', 'divTableRowHead')
    var img_icon = document.createElement('img')
    img_icon.setAttribute('src', matches[key].iconUrl)
    img_icon.setAttribute('class', 'dapp-icon-wrapper')
    td_iconName.appendChild(img_icon) // append image to cell

    // add name to dapp image cell
    var name = document.createTextNode(matches[key].name)
    td_iconName.appendChild(name)
    tr.appendChild(td_iconName)

    // transaction sends count cell
    var txCount = document.createElement('div')
    txCount.setAttribute('class', 'divTableCell')
    txCount.textContent = matches[key].txCount
    tr.appendChild(txCount)

    // transaction receives count cell
    var rxCount = document.createElement('div')
    rxCount.setAttribute('class', 'divTableCell')
    rxCount.textContent = matches[key].rxCount
    tr.appendChild(rxCount)

    // ETH sent cell
    var ethSent = document.createElement('div')
    ethSent.setAttribute('class', 'divTableCell')
    if (matches[key].ETHsent === undefined)
      ethSent.textContent = 0
    else
      ethSent.textContent = parseFloat(web3.utils.fromWei(matches[key].ETHsent.toString(), 'ether')).toFixed(4)
    tr.appendChild(ethSent)

    // ETH received cell
    var ethRecv = document.createElement('div')
    ethRecv.setAttribute('class', 'divTableCell')
    if (matches[key].ETHrecv === undefined)
      ethRecv.textContent = 0
    else
      ethRecv.textContent = parseFloat(web3.utils.fromWei(matches[key].ETHrecv.toString(), 'ether')).toFixed(4)
    tr.appendChild(ethRecv)

    // Gas sent cell
    var gasSent = document.createElement('div')
    gasSent.setAttribute('class', 'divTableCell')
    if (matches[key].gasSent === undefined)
      gasSent.textContent = 0
    else
      gasSent.textContent = parseFloat(web3.utils.fromWei(matches[key].gasSent.toString(), 'ether')).toFixed(4)
    tr.appendChild(gasSent)
  }
}

// wait for everything to load before initializing
window.addEventListener('load', function() {
  // check if Web3 has been injected by the browser (Mist/MetaMask)
  if (window.web3) {
    console.log('web3old', web3.version)
    // replace the old injected version by the latest build of Web3.js version 1.0.0 beta
    web3 = new Web3(web3.currentProvider);
    console.log('new web3', web3.version)
  } else {
    web3 = new Web3(new Web3.providers.HttpProvider("https://mainnet.infura.io/"));
    console.log('browser does not have injected web3')
  }
  startApp()
});
