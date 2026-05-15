import http from 'node:http'

const data = JSON.stringify({ text: 'Hello world.', level: 'B1' })

const req = http.request(
  {
    hostname: 'localhost',
    port: 3000,
    path: '/api/generate-reading',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    },
  },
  (res) => {
    let body = ''
    res.on('data', (chunk) => {
      body += chunk
    })
    res.on('end', () => {
      console.log('status', res.statusCode)
      console.log(body)
    })
  }
)

req.on('error', (err) => {
  console.error('request error', err)
})

req.write(data)
req.end()
