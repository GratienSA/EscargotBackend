import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
  } from '@nestjs/websockets';
  import { Injectable, Inject, forwardRef } from '@nestjs/common';
 import { Socket, Server } from 'socket.io';
import { ProductService } from './product.service';
  
  @Injectable()
  @WebSocketGateway(3333, { cors: true })
  export class ProductGateway implements OnGatewayConnection, OnGatewayDisconnect {
    constructor(
      @Inject(forwardRef(() => ProductService))
      private readonly productService: ProductService,
    ) {}
  
    @WebSocketServer() server: Server;
  
    async handleConnection() {
      this.server.emit('product', await this.productService.getAllProducts());
    }
  
    async handleDisconnect() {
      this.server.emit('product', await this.productService.getAllProducts());
      return;
    }
  
    @SubscribeMessage('newProduct')
    async handleNewProducts(client: Socket, message: 'newProduct') {
      console.log(message);
      client.emit('newProduct', await this.productService.getAllProducts());
      this.server.emit('newProduct', await this.productService.getAllProducts());
    }
  }
  