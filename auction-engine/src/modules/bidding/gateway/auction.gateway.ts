import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/auctions',
})
export class AuctionGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(AuctionGateway.name);

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe:auction')
  handleSubscribeAuction(client: Socket, auctionId: string): void {
    client.join(`auction:${auctionId}`);
    this.logger.debug(`Client ${client.id} subscribed to auction:${auctionId}`);
  }

  @SubscribeMessage('unsubscribe:auction')
  handleUnsubscribeAuction(client: Socket, auctionId: string): void {
    client.leave(`auction:${auctionId}`);
  }

  broadcastAuctionUpdate(payload: {
    auction_id: string;
    new_bid_amount: number;
    total_bids: number;
    timestamp: string;
  }): void {
    this.server.to(`auction:${payload.auction_id}`).emit('auction:update', payload);
  }

  broadcastServerTime(auctionId: string, serverTime: string): void {
    this.server
      .to(`auction:${auctionId}`)
      .emit('server_time', { server_time: serverTime });
  }
}
