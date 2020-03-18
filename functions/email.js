'use strict'

const { default: axios } = require('axios')
const nodemailer = require('nodemailer')

const {
  DOCUMENT_HOST = 'https://monsters-local.kuali.co',
  EMAIL_KEY = 'Submitter-Email',
  FROM = 'Kuali Notifications <no-reply@kuali.co>',
  SMTP_HOST = 'localhost',
  SMTP_PORT = '1025',
  SMTP_USER,
  SMTP_PASS,
  SMTP_DKIM_DOMAIN,
  SMTP_DKIM_KEY_SELECTOR,
  SMTP_DKIM_PRIVATE_KEY
} = process.env

const smtpDkim = SMTP_DKIM_PRIVATE_KEY
  ? {
      domainName: SMTP_DKIM_DOMAIN,
      keySelector: SMTP_DKIM_KEY_SELECTOR,
      privateKey: SMTP_DKIM_PRIVATE_KEY
    }
  : undefined

const smtpAuth = SMTP_USER
  ? {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  : undefined

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  auth: smtpAuth,
  dkim: smtpDkim,
  ignoreTLS: DOCUMENT_HOST === 'https://monsters-local.kuali.co'
})

console.log({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  auth: smtpAuth ? 'has auth' : null,
  dkim: smtpDkim ? 'has dkim config' : null,
  ignoreTLS: DOCUMENT_HOST === 'https://monsters-local.kuali.co'
})

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false
  const body = JSON.parse(event.body)

  const docId = body.formId
  const email = body[EMAIL_KEY]
  const subject = 'Document Export'
  const text = 'Attached is your document'
  const html = '<p>Attached is your document</p>'

  if (!email) return { statusCode: 400, body: 'No Email Provided' }

  const { data } = await axios.get(
    `${DOCUMENT_HOST}/app/api/v0/apps/document/${docId}/genarchive?options=document`,
    {
      headers: { Authorization: event.headers.authorization },
      responseType: 'stream'
    }
  )

  const attachments = [
    {
      filename: 'document.txt',
      content: data
    }
  ]

  await transporter.sendMail({
    from: FROM,
    to: email,
    subject,
    text,
    html,
    attachments
  })

  return { statusCode: 200, body: 'done' }
}
