import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

@Injectable()
export class ImageService {
  private readonly uploadDir = join(__dirname, '..', '..', 'uploads');

  constructor(private readonly prisma: PrismaService) {
    this.ensureUploadDirectoriesExist();
  }

  private ensureUploadDirectoriesExist() {
    const directories = ['products', 'profiles'];
    directories.forEach(dir => {
      const path = join(this.uploadDir, dir);
      if (!existsSync(path)) {
        mkdirSync(path, { recursive: true });
      }
    });
  }

  async saveImage(type: 'product' | 'profile', fileName: string, userId: number, entityId?: number): Promise<string> {
    console.log('Saving image of type:', type); 
    const folder = type === 'product' ? 'products' : 'profiles';
    const imagePath = `uploads/${folder}/${fileName}`;
    
    if (type === 'profile') {
      await this.prisma.user.update({
        where: { id: userId },
        data: { profileImagePath: imagePath },
      });
    } else if (type === 'product' && entityId) {
      await this.prisma.product.update({
        where: { id: entityId },
        data: { imagePath: imagePath },
      });
    }
  
    console.log(`${type} image saved: ${imagePath}`);
    return imagePath;
  }
  checkImageExists(imagePath: string): boolean {
    const filePath = join(this.uploadDir, '..', imagePath);
    return existsSync(filePath);
  }

  getImagePath(imagePath: string): string {
    return join(this.uploadDir, '..', imagePath);
  }
}