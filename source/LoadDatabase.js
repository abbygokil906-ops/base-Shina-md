/*
   Fuyuha Shina Multi Device
   Owner: Megumi Kaito
*/


async function LoadDataBase(conn, m) {
  try {
    const botNumber = await conn.decodeJid(conn.user.id);

    if (typeof global.db.users !== 'object') global.db.users = {};
    if (typeof global.db.groups !== 'object') global.db.groups = {};
    if (typeof global.db.settings !== 'object') global.db.settings = {};

    const defaultSettings = { welcome: false, developer: [], reseller: [], autoread: false, autotyping: false, autoreadsw: false };
    for (let key in defaultSettings) {
      if (!(key in global.db.settings)) global.db.settings[key] = defaultSettings[key];
    }

    if (typeof global.db.users[m.sender] !== 'object') global.db.users[m.sender] = {};

    if (m.isGroup) {
      if (typeof global.db.groups[m.chat] !== 'object') global.db.groups[m.chat] = {};
      const defaultGroup = { antilink: false, antilink2: false, antilinkch: false, antitagch: false, antitagsw: false, antisw: false, antitoxic: false, antibokep: false, antidel: false, welcome: false };
      for (let key in defaultGroup) {
        if (!(key in global.db.groups[m.chat])) global.db.groups[m.chat][key] = defaultGroup[key];
      }
    }
  } catch (e) {
    throw e;
  }
}

module.exports = LoadDataBase;