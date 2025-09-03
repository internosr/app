require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');
const path = require('path'); // Import the path module
const https = require('https');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração para permitir que o servidor receba dados JSON e URL-encoded.
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors()); // Permite requisições de outras origens, essencial para o frontend.
app.use(express.static(path.join(__dirname, '/'))); // Permite servir arquivos estáticos

const SERPRO_AUTH_URL = process.env.SERPRO_AUTH_URL;
const SERPRO_TOKEN_URL = process.env.SERPRO_TOKEN_URL;
const SERPRO_SIGN_URL = process.env.SERPRO_SIGN_URL;
const SERPRO_CLIENT_ID = process.env.SERPRO_CLIENT_ID;
const SERPRO_CLIENT_SECRET = process.env.SERPRO_CLIENT_SECRET;
const SERPRO_SCOPES = process.env.SERPRO_SCOPES || 'single_signature';

const isProduction = process.env.NODE_ENV === 'production';
const redirectUri = isProduction
    ? 'https://prontuariosr.onrender.com/callback'
    : 'http://localhost:3000/callback';

/**
 * Rota para iniciar o fluxo de autenticação do SerproID.
 * Esta rota será chamada pelo seu frontend.
 */
app.get('/auth', (req, res) => {
    const { code_challenge, code_challenge_method, state } = req.query;

    if (!code_challenge || !code_challenge_method || !state) {
        return res.status(400).json({ error: 'Parâmetros PKCE ausentes.' });
    }

    const authUrl = new URL(SERPRO_AUTH_URL);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', SERPRO_CLIENT_ID);
    authUrl.searchParams.append('scope', SERPRO_SCOPES);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('code_challenge', code_challenge);
    authUrl.searchParams.append('code_challenge_method', code_challenge_method);
    authUrl.searchParams.append('state', state); // O 'state' é onde o code_verifier é enviado
    authUrl.searchParams.append('response_mode', 'query');

    res.redirect(authUrl.toString());
});

/**
 * Rota de callback que o SerproID irá chamar após a autenticação.
 * Esta rota é responsável por trocar o código de autorização pelo token de acesso.
 */
app.get('/callback', async (req, res) => {
    const { code, state } = req.query; // 'state' é onde o SerproID retorna o code_verifier

    if (!code || !state) {
        return res.status(400).send('Código de autorização ou verificador não recebido.');
    }

    try {
        const tokenPayload = new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            client_id: SERPRO_CLIENT_ID,
            client_secret: SERPRO_CLIENT_SECRET,
            code_verifier: state // Usa o 'state' como o verifier
        });

        const tokenResponse = await axios.post(SERPRO_TOKEN_URL, tokenPayload, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const { access_token } = tokenResponse.data;

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Autenticação Concluída</title>
                <script>
                    window.onload = function() {
                        if (window.opener) {
                            window.opener.postMessage({ type: 'serproid-auth-complete', token: '${access_token}' }, window.location.origin);
                            window.close();
                        }
                    };
                </script>
            </head>
            <body>
                <p>Autenticação concluída. Você pode fechar esta janela.</p>
            </body>
            </html>
        `;
        res.send(html);

    } catch (error) {
        console.error('Erro na troca de código por token:', error.message);
        if (error.response) {
            console.error('Dados do erro:', error.response.data);
        }
        res.status(500).send('Erro na autenticação.');
    }
});

/**
 * Rota que receberá o PDF do frontend para ser assinado.
 */
app.post('/assinar', async (req, res) => {
    try {
        const { pdf: pdfBase64, accessToken } = req.body;

        if (!pdfBase64 || !accessToken) {
            return res.status(400).json({ error: 'PDF ou token de acesso não recebido.' });
        }

        const signPayload = {
            base64: pdfBase64,
            assinaturas: [
                {
                    accessToken,
                    x: 100,
                    y: 100,
                    pagina: 1,
                    largura: 200,
                    altura: 50,
                    imagem: 'serpro_padrao'
                }
            ]
        };
        
        const signResponse = await axios.post(SERPRO_SIGN_URL, signPayload, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            }
        });

        const pdfAssinado = signResponse.data.base64;

        res.status(200).json({ pdfAssinado });

    } catch (error) {
        console.error('Erro na assinatura do PDF:', error.message);
        if (error.response) {
            console.error('Dados do erro:', error.response.data);
        }
        res.status(500).json({ error: 'Erro ao assinar o PDF.' });
    }
});

// Rota de saúde para verificar se o servidor está online
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

/**
 * Rota de proxy para a triagem usando Puppeteer.
 */
app.get('/triagem-proxy', async (req, res) => {
    let browser;
    try {
        // Lança uma nova instância do navegador Chromium.
        browser = await puppeteer.launch({ 
            headless: true, // Modo sem interface gráfica.
            ignoreHTTPSErrors: true,
            args: ["--ignore-certificate-errors"] // Ignora erros de certificado, como o que você estava tendo.
        });
        const page = await browser.newPage();
        
        await page.goto('https://agmejc.mejc.br/app/urgenciasca/consultasclassificacaorisco', {
            waitUntil: 'networkidle2' // Espera a rede ficar inativa para garantir que tudo foi carregado.
        });

        // Extrai o HTML da página após a renderização.
        const htmlContent = await page.content();
        
        // Envia o HTML de volta para o seu frontend.
        res.send(htmlContent);

    } catch (error) {
        console.error('Erro ao buscar dados da triagem com Puppeteer:', error);
        res.status(500).send('Erro ao buscar dados da triagem.');
    } finally {
        // Garante que o navegador seja fechado, mesmo se ocorrer um erro.
        if (browser) {
            await browser.close();
        }
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});