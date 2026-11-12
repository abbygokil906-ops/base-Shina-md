/*
# Name : iLoveIMG removebg
# Type : CommonJS (CJS)
# base URL : https://www.iloveimg.com/id/hapus-latar-belakang
# sumber : https://whatsapp.com/channel/0029Vb6EHtR5Ui2gHMW9zX2x
*/

const axios = require('axios');

const BASE_URL = 'https://www.iloveimg.com';
const TOOL = 'removebackgroundimage';

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
  'Origin': BASE_URL,
  'Referer': `${BASE_URL}/id/hapus-latar-belakang`,
  'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"'
};

function parseErrorMessage(error) {
  if (error.response && error.response.data) {
    const data = error.response.data;
    if (typeof data === 'string') return data;
    if (data.message) return typeof data.message === 'object' ? JSON.stringify(data.message) : data.message;
    if (data.error) return typeof data.error === 'object' ? JSON.stringify(data.error) : data.error;
    return JSON.stringify(data);
  }
  return error.message || 'Unknown Error';
}

async function removeBgILoveImg(imageUrl) {
  if (!imageUrl) {
    throw new Error('URL Gambar wajib diisi!');
  }

  try {
    const pageRes = await axios.get(`${BASE_URL}/id/hapus-latar-belakang`, {
      headers,
      timeout: 30000
    });

    const html = pageRes.data;

    const tokenMatch = html.match(/"token"\s*:\s*"([^"]+)"/);
    if (!tokenMatch) {
      throw new Error('Gagal mengekstrak Token Auth dari halaman iLoveIMG');
    }

    const bearerToken = tokenMatch[1];
    const authHeaders = {
      ...headers,
      'Authorization': `Bearer ${bearerToken}`
    };

    const taskRes = await axios.get(`https://api.iloveimg.com/v1/start/${TOOL}`, {
      headers: authHeaders,
      timeout: 30000
    }).catch(err => {
      throw new Error(`Start Task Failed: ${parseErrorMessage(err)}`);
    });

    const { task, server } = taskRes.data;
    if (!task || !server) {
      throw new Error('Gagal mendapatkan Task ID dari server iLoveIMG');
    }

    const uploadPayload = {
      task: task,
      cloud_file: imageUrl
    };

    const uploadRes = await axios.post(`https://${server}/v1/upload`, uploadPayload, {
      headers: authHeaders,
      timeout: 30000
    }).catch(async () => {
      return await axios.post(`https://${server}/v1/upload`, { task: task, url: imageUrl }, {
        headers: authHeaders,
        timeout: 30000
      }).catch(err => {
        throw new Error(`Upload Failed: ${parseErrorMessage(err)}`);
      });
    });

    const serverFilename = uploadRes.data?.server_filename;
    if (!serverFilename) {
      throw new Error('Gagal mengunggah gambar ke server pemrosesan');
    }

    const originalFilename = imageUrl.split('/').pop().split('?')[0] || 'image.jpg';

    const processPayload = {
      task: task,
      tool: TOOL,
      files: [
        {
          server_filename: serverFilename,
          filename: originalFilename
        }
      ]
    };

    const processRes = await axios.post(`https://${server}/v1/process`, processPayload, {
      headers: authHeaders,
      timeout: 30000
    }).catch(err => {
      throw new Error(`Process Failed: ${parseErrorMessage(err)}`);
    });

    return {
      status: true,
      creator: 'rinaa imup',
      taskId: task,
      downloadUrl: `https://${server}/v1/download/${task}`,
      outputSize: processRes.data?.output_filesize || null,
      message: 'Berhasil menghapus latar belakang gambar',
      // tambahan untuk plugin: token dipakai lagi waktu download hasilnya
      _auth: authHeaders
    };

  } catch (error) {
    throw new Error(parseErrorMessage(error));
  }
}

module.exports = {
  removeBgILoveImg
};
