import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import * as path from 'path';

// Importation du module de façon spécifique
import { NodemailerExpressHandlebarsOptions } from 'nodemailer-express-handlebars';
const hbs = require('nodemailer-express-handlebars');

interface ExtendedMailOptions extends nodemailer.SendMailOptions {
  template?: string;
  context?: any;
}

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get('SMTP_HOST'),
      port: Number(this.config.get('SMTP_PORT')),
      secure: false,
      auth: {
        user: this.config.get('SMTP_EMAIL'),
        pass: this.config.get('SMTP_PASSWORD'),
      },
    });

    // Configuration des options Handlebars
    const handlebarOptions: NodemailerExpressHandlebarsOptions = {
      viewEngine: {
        extName: '.hbs',
        partialsDir: path.resolve('./src/templates'),
        defaultLayout: false,
      },
      viewPath: path.resolve('./src/templates'),
      extName: '.hbs',
    };

    // Enregistrement de Handlebars comme moteur de compilation
    this.transporter.use('compile', hbs(handlebarOptions));
  }

  async sendUserConfirmation(user: User, token: string) {
    const confirmationUrl = `http://localhost:3000/fresh-snails`;

    await this.transporter.sendMail({
      from: this.config.get('SMTP_EMAIL'),
      to: user.email,
      subject: 'Bienvenue chez Escargot du Clos - Confirmez votre inscription',
      template: 'WelcomeEmail',
      context: { 
        user: user,
        confirmationUrl: confirmationUrl,
        baseUrl: this.config.get('SERVER_URL'),
      },
    } as ExtendedMailOptions);
  }

  async sendResetPassword(user: User, code: string, resetUrl: string) {
    await this.transporter.sendMail({
      from: this.config.get('SMTP_EMAIL'),
      to: user.email,
      subject: 'Réinitialisation de mot de passe - Escargot du Clos',
      template: 'ResetPassword',
      context: { 
        user: user,
        code: code,
        resetUrl: resetUrl,
        baseUrl: this.config.get('SERVER_URL'),
      },
    } as ExtendedMailOptions);
  }

  async sendPurchaseReceipt(order): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.get('SMTP_EMAIL'),
      to: order.user.email,
      subject: 'Reçu de votre commande',
      template: 'PurchaseReceipt', 
      context: {
        userName: order.user.name,
        orderId: order.id,
        totalAmount: order.totalAmount.toFixed(2), 
        items: order.orderItems.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price.toFixed(2),
        })),
        baseUrl: this.config.get('SERVER_URL'),
      },
    } as ExtendedMailOptions);
  }
}