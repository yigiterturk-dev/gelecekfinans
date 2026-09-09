import { config } from 'dotenv'
config({ path: '.env.local' })
import { google } from 'googleapis'
const auth = new google.auth.JWT({
  email: process.env.GSC_CLIENT_EMAIL,
  key: (process.env.GSC_PRIVATE_KEY||'').replace(/\\n/g,'\n'),
  scopes: ['https://www.googleapis.com/auth/webmasters','https://www.googleapis.com/auth/siteverification'],
})
const sc = google.searchconsole({ version:'v1', auth })
sc.sites.list({}).then(r=>{
console.log(JSON.stringify(r.data.siteEntry,null,1))})
