const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { scrapeGame } = require('./scraper');

const app = express();
app.use(cors());
app.use(express.json());

const jobs = new Map();

app.post('/api/scrape', (req, res) => {
    const { url, domain } = req.body;
    if (!url || !domain) {
        return res.status(400).json({ error: 'URL and target domain are required.' });
    }

    const jobId = Date.now().toString();
    jobs.set(jobId, { status: 'initializing', files: 0, logs: [] });

    // Start scraping asynchronously
    scrapeGame(url, domain, jobId, (event, data) => {
        const job = jobs.get(jobId);
        if (event === 'log') {
            job.logs.push(data);
        } else if (event === 'file') {
            job.files += 1;
        } else if (event === 'status') {
            job.status = data;
        }
    }).then((zipPath) => {
        const job = jobs.get(jobId);
        job.status = 'completed';
        job.zipPath = zipPath;
    }).catch((err) => {
        const job = jobs.get(jobId);
        job.status = 'failed';
        job.error = err.message;
    });

    res.json({ jobId });
});

// Simple polling endpoint
app.get('/api/status/:id', (req, res) => {
    const job = jobs.get(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
});

app.get('/api/download/:id', (req, res) => {
    const job = jobs.get(req.params.id);
    if (!job || job.status !== 'completed' || !job.zipPath) {
        return res.status(404).json({ error: 'Download not available' });
    }
    res.download(job.zipPath, `game-assets-${req.params.id}.zip`);
});

const PORT = process.env.PORT || 3001;

// Serve React App
app.use(express.static(path.join(__dirname, '../client/dist')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
