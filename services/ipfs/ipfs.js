const ipfsAPI = require('ipfs-api')
const ipfsHost = process.env.IPFSHOST || 'ipfs.infura.io'
const ipfsPort = process.env.IPFSPORT || '5001'
const ipfsProtocol = process.env.IPFSPROTOCOL || 'https'

const ipfs = ipfsAPI(ipfsHost, ipfsPort, { protocol: ipfsProtocol })

function addFileToIpfs(file) {
    return new Promise((resolve, reject) => {
        let buffer = Buffer.from(file)
        ipfs.files.add(buffer)
            .then(function (result) {
                // console.log('addFileToIpfs result', result)
                if (result[0]) {
                    return resolve(result[0].hash)
                } else {
                    return reject('Error adding data to ipfs')
                }
            })
            .catch(function (err) {
                //TODO: Logger
                console.log(err)
                return reject('ipfs error', err)
            })
    })
}

module.exports = {
    addFileToIpfs: addFileToIpfs
}
