import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const { type } = await req.json();

    // 🔴 IMPORTANT: Yahan apni Gmail Details Daalein
    const MY_GMAIL = 'Deepanshu.rana@redcliffelabs.com'; // Apna Gmail likhein
    const APP_PASSWORD = 'ubth fpgp fnwb vxcq'; // Apna 16-digit App Password bina space ke

    // 🛡️ NAYA FEATURE: TEST MODE
    // Isko 'true' rakhenge toh saare email clients ki jagah aapko aayenge.
    // Jab final live karna ho, toh isko 'false' kar dena.
    const TEST_MODE = true; 

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: MY_GMAIL, pass: APP_PASSWORD },
    });

    const { data: quotes } = await supabase.from('Quote_Master_2026').select('*');
    const { data: sourceData } = await supabase.from('Source Data').select('*');

    if (!quotes || !sourceData) throw new Error("Data fetch error");

    let emailsSent = 0;
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    for (const quote of quotes) {
      const clientName = quote['Company/Client Name'];
      const quoteDate = new Date(quote['Quote Requested Date']); 
      const dealStatus = quote['Deal Status'] || 'Pending';
      
      let shouldSend = false;
      let emailSubject = "";
      let emailHTML = "";

      // 🟢 LOGIC 1: Exact 4 Days Ago Follow-up
      if (type === '4-days') {
        const diffTime = Math.abs(today.getTime() - quoteDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 4 && dealStatus !== 'Won' && dealStatus !== 'Lost') {
          shouldSend = true;
          emailSubject = `Action Required: 4-Day Follow up for ${clientName}`;
          emailHTML = `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
              <h3 style="color: #0f2e5a;">Hello Team,</h3>
              <p>This is an automated 4-day reminder for the quote generated on <b>${quote['Quote Requested Date']}</b>.</p>
              <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <p style="margin: 5px 0;">Client: <b>${clientName}</b></p>
                <p style="margin: 5px 0;">Quote Code: <b>${quote['Quote code']}</b></p>
              </div>
              <p>Please follow up with the client regarding this proposal.</p>
              <br/>
              <p style="font-size: 12px; color: #666;">Best regards,<br/><b>Intelligence Core System</b></p>
            </div>
          `;
        }
      }

      // 🟢 LOGIC 2: Last Month Pending
      if (type === 'last-month') {
        let isLastMonth = false;
        if (currentMonth === 0) { 
          isLastMonth = (quoteDate.getMonth() === 11 && quoteDate.getFullYear() === currentYear - 1);
        } else {
          isLastMonth = (quoteDate.getMonth() === currentMonth - 1 && quoteDate.getFullYear() === currentYear);
        }

        if (isLastMonth && dealStatus !== 'Won' && dealStatus !== 'Lost') {
          shouldSend = true;
          emailSubject = `Pending Quote Alert: Last Month's Pipeline - ${clientName}`;
          emailHTML = `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
              <h3 style="color: #e3004f;">Hello Team,</h3>
              <p>The following quote from last month is still pending closure.</p>
              <div style="background-color: #fff5f5; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #fee2e2;">
                <p style="margin: 5px 0;">Client: <b>${clientName}</b></p>
                <p style="margin: 5px 0;">Quote Code: <b>${quote['Quote code']}</b></p>
                <p style="margin: 5px 0;">Date: <b>${quote['Quote Requested Date']}</b></p>
              </div>
              <p>Kindly review and update the status in the CRM.</p>
              <br/>
              <p style="font-size: 12px; color: #666;">Best regards,<br/><b>Intelligence Core System</b></p>
            </div>
          `;
        }
      }

      // 🚀 Bhejne ka Engine (Test Mode Logic Ke Sath)
      if (shouldSend) {
        const clientInfo = sourceData.find(s => s['Company/Client Name'] === clientName);
        if (clientInfo && clientInfo['Email ID']) {
          
          let toEmail = clientInfo['Email ID'];
          let ccEmail = clientInfo['CC Email ID'] || '';
          let finalSubject = emailSubject;

          // 🛡️ Test Mode Overrides
          if (TEST_MODE) {
            finalSubject = `[TEST MODE - Dest: ${toEmail}] ${emailSubject}`;
            toEmail = MY_GMAIL; // Saare email aapke khud ke inbox mein aayenge
            ccEmail = ''; // Testing mein CC ko blank rakhein
          }

          await transporter.sendMail({
            from: `"Intelligence Core" <${MY_GMAIL}>`, 
            to: toEmail,
            cc: ccEmail,
            subject: finalSubject,
            html: emailHTML,
          });
          emailsSent++;
        }
      }
    }

    const testMessage = TEST_MODE ? "(TEST MODE ON: All emails were sent to you instead of clients.)" : "";
    return NextResponse.json({ success: true, count: emailsSent, message: `${emailsSent} emails processed successfully! ${testMessage}` });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}