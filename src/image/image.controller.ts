import { Controller, UseInterceptors, UploadedFile, Post, Get, Param, Res, UseGuards, Body } from '@nestjs/common';
import { ImageService } from './image.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { createReadStream, existsSync, mkdirSync } from 'fs';
import { Response } from 'express';
import { GetUser } from '../auth/decorator';
import { JwtGuard } from 'src/auth/guard/jwt.guard';

@Controller('image')
export class ImageController {
  constructor(private readonly imageService: ImageService) {}

@Post('/upload')
@UseGuards(JwtGuard)
@UseInterceptors(
  FileInterceptor('file', {
    storage: diskStorage({
      destination: (req,file, cb) => {
        const type = req.body.type as 'product' | 'profile';
        console.log('Upload type from request body:', type);
        const folder = type === 'product' ? 'profiles' : 'products';
        const uploadPath = join(__dirname, '..', '..', 'uploads', folder);
        if (!existsSync(uploadPath)) {
          mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const type = req.body.type as 'product' | 'profile';
        console.log('Type used for filename:', type); 
        cb(null, `${type || 'file'}-${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
  }),
)
async uploadImage(
  @UploadedFile() file: Express.Multer.File,
  @Body('type') type: 'product' | 'profile',
  @Body('id') id: string,
  @GetUser() user,
) {
  if (!file) {
    throw new Error('No file uploaded');
  }
  console.log('Received type in controller:', type);
  const imagePath = await this.imageService.saveImage(type, file.filename, user.id, id ? parseInt(id) : undefined);
  return { imagePath };
}

  @Get('/view/:imagePath')
  async getImage(@Param('imagePath') imagePath: string, @Res() res: Response) {
    if (this.imageService.checkImageExists(imagePath)) {
      const filePath = this.imageService.getImagePath(imagePath);
      const fileStream = createReadStream(filePath);
      fileStream.pipe(res);
    } else {
      res.status(404).json({ message: 'Image not found' });
    }
  }
}