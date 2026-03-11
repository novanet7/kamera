const express = require('express');
const app = express();

// Halaman utama (broadcaster) - langsung minta izin kamera
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CCTV Broadcaster</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
            background: #1a1a1a;
            color: white;
            text-align: center;
        }
        video {
            width: 100%;
            max-width: 800px;
            border: 3px solid #333;
            border-radius: 10px;
            background: black;
        }
        .status {
            margin-top: 20px;
            padding: 10px;
            border-radius: 5px;
            background: #333;
        }
        .connected { background: #2ecc71; color: black; }
        .disconnected { background: #e74c3c; }
    </style>
</head>
<body>
    <h1>📹 CCTV Broadcaster</h1>
    <p>Halaman ini akan mengirimkan video kamera Anda ke admin.</p>
    <video id="localVideo" autoplay playsinline muted></video>
    <div id="status" class="status disconnected">⏳ Meminta izin kamera...</div>

    <script src="https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js"></script>
    <script>
        const peer = new Peer();
        let localStream;
        const statusDiv = document.getElementById('status');

        navigator.mediaDevices.getUserMedia({ video: true, audio: false })
            .then(stream => {
                localStream = stream;
                document.getElementById('localVideo').srcObject = stream;
                statusDiv.textContent = '✅ Kamera aktif. Menyiapkan koneksi...';
                statusDiv.className = 'status';

                peer.on('open', (id) => {
                    console.log('Peer ID:', id);
                    statusDiv.textContent = '🔗 Terhubung ke server, mencoba menghubungi admin...';
                    
                    const call = peer.call('admin', stream);
                    
                    call.on('close', () => {
                        statusDiv.textContent = '❌ Admin terputus. Menunggu reconnect...';
                        statusDiv.className = 'status disconnected';
                    });
                    
                    call.on('error', (err) => {
                        console.error('Call error:', err);
                        statusDiv.textContent = '⚠️ Gagal terhubung ke admin. Pastikan admin online.';
                        statusDiv.className = 'status disconnected';
                    });
                });

                peer.on('error', (err) => {
                    console.error('Peer error:', err);
                    statusDiv.textContent = '❌ Koneksi ke server gagal. Periksa internet.';
                    statusDiv.className = 'status disconnected';
                });
            })
            .catch(err => {
                console.error('Camera error:', err);
                statusDiv.textContent = '❌ Gagal mengakses kamera. Berikan izin.';
                statusDiv.className = 'status disconnected';
            });
    </script>
</body>
</html>
  `);
});

// Halaman admin - menerima stream dari broadcaster
app.get('/admin', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CCTV Admin</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
            background: #1a1a1a;
            color: white;
            text-align: center;
        }
        video {
            width: 100%;
            max-width: 800px;
            border: 3px solid #333;
            border-radius: 10px;
            background: black;
        }
        .status {
            margin-top: 20px;
            padding: 10px;
            border-radius: 5px;
            background: #333;
        }
        .connected { background: #2ecc71; color: black; }
        .waiting { background: #f39c12; }
        .disconnected { background: #e74c3c; }
    </style>
</head>
<body>
    <h1>📺 CCTV Admin</h1>
    <p>Menampilkan video dari broadcaster secara live.</p>
    <video id="remoteVideo" autoplay playsinline></video>
    <div id="status" class="status waiting">⏳ Menunggu broadcaster...</div>

    <script src="https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js"></script>
    <script>
        const peer = new Peer('admin');
        const statusDiv = document.getElementById('status');

        peer.on('open', (id) => {
            console.log('Admin peer ready with ID:', id);
            statusDiv.textContent = '🟢 Admin siap, menunggu broadcaster...';
            statusDiv.className = 'status waiting';
        });

        peer.on('call', (call) => {
            statusDiv.textContent = '📞 Ada panggilan masuk! Menerima...';
            call.answer();

            call.on('stream', (remoteStream) => {
                document.getElementById('remoteVideo').srcObject = remoteStream;
                statusDiv.textContent = '✅ Streaming aktif';
                statusDiv.className = 'status connected';
            });

            call.on('close', () => {
                statusDiv.textContent = '❌ Broadcaster terputus. Menunggu...';
                statusDiv.className = 'status waiting';
            });

            call.on('error', (err) => {
                console.error('Call error:', err);
                statusDiv.textContent = '⚠️ Error pada stream.';
                statusDiv.className = 'status disconnected';
            });
        });

        peer.on('error', (err) => {
            console.error('Peer error:', err);
            statusDiv.textContent = '❌ Gagal koneksi ke server. Periksa internet.';
            statusDiv.className = 'status disconnected';
        });
    </script>
</body>
</html>
  `);
});

// Handle 404
app.use((req, res) => {
  res.status(404).send('404 - Halaman tidak ditemukan');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📹 Broadcaster: http://localhost:${PORT}`);
  console.log(`👑 Admin: http://localhost:${PORT}/admin`);
});