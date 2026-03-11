import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

let elements = [
    { value: 1, text: 'Toyota' },
    { value: 2, text: 'Honda' },
    { value: 3, text: 'Ford' },
    { value: 4, text: 'Chevrolet' },
    { value: 5, text: 'BMW', disabled: true }
];
let nextvalue = 6;

app.get('/elements', (req, res) => {
    const q = req.query.q ? req.query.q.toLowerCase() : '';
    const filtered = elements.filter(e => e.text.toLowerCase().includes(q));
    res.json(filtered);
});

app.get('/elements-error', (req, res) => {
    res.status(500).json({})
});

app.get('/elements-error2', (req, res) => {
    res.status(500).json({ message: '500内部服务器错误' });
});

app.post('/elements-error', (req, res) => {
    res.status(422).json({});
});

app.post('/elements-error2', (req, res) => {
    res.status(422).json({ message: '车辆名称已存在' });
});

app.post('/elements', (req, res) => {
    const { addable } = req.body;
    if (!addable) return res.status(400).json({ error: 'addable is required' });
    const exists = elements.find(e => e.text.toLowerCase() === addable.toLowerCase());
    if (exists) return res.status(409).json({ error: 'Element already exists' });
    const newElement = { value: nextvalue++, text: addable };
    elements.push(newElement);
    res.status(201).json(newElement);
});

app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});
