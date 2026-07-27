import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from './entities/favorite.entity';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite)
    private favoriteRepository: Repository<Favorite>,
  ) {}

  async addFavorite(userId: string, auctionId: string): Promise<Favorite> {
    const existing = await this.favoriteRepository.findOne({
      where: { user_id: userId, auction_id: auctionId },
    });
    if (existing) return existing;

    const favorite = this.favoriteRepository.create({
      user_id: userId,
      auction_id: auctionId,
    });
    return this.favoriteRepository.save(favorite);
  }

  async removeFavorite(userId: string, auctionId: string): Promise<void> {
    await this.favoriteRepository.delete({
      user_id: userId,
      auction_id: auctionId,
    });
  }

  async getUserFavorites(userId: string, page = 1, limit = 20): Promise<{ data: Favorite[]; total: number }> {
    const [data, total] = await this.favoriteRepository.findAndCount({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }

  async isFavorite(userId: string, auctionId: string): Promise<boolean> {
    const count = await this.favoriteRepository.count({
      where: { user_id: userId, auction_id: auctionId },
    });
    return count > 0;
  }
}
