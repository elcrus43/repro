import dotenv from 'dotenv';
dotenv.config();

const url = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const ZHIPU_API_KEY = process.env.VITE_ZHIPU_API_KEY;

const models = ['glm-zero-preview', 'glm-4', 'glm-4v', 'glm-4-plus', 'glm-4-long'];

async function testModels() {
    for (const model of models) {
        console.log(`\nTesting ${model}...`);
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${ZHIPU_API_KEY}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: 'user', content: 'Say hi' }],
                    temperature: 0.1,
                    max_tokens: 10
                })
            });
            const text = await res.text();
            console.log(`Status: ${res.status}`);
            console.log(`Response: ${text.slice(0, 150)}`);
        } catch (err) {
            console.log(`Error: ${err.message}`);
        }
    }
}

testModels();
