import { Injectable, InternalServerErrorException } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { v2 as cloudinary } from 'cloudinary';
import { randomUUID } from 'crypto';
import * as path from 'path';
import * as fs from 'fs';

type StorageMode = 'cloudinary' | 's3' | 'local';

@Injectable()
export class S3Service {
  private s3: S3Client | null = null;
  private readonly uploadsDir = path.join(process.cwd(), 'uploads');
  private readonly mode: StorageMode;

  constructor() {
    const {
      CLOUDINARY_CLOUD_NAME,
      CLOUDINARY_API_KEY,
      CLOUDINARY_API_SECRET,
      AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY,
      AWS_S3_BUCKET,
      AWS_REGION,
    } = process.env;

    if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
      cloudinary.config({
        cloud_name: CLOUDINARY_CLOUD_NAME,
        api_key: CLOUDINARY_API_KEY,
        api_secret: CLOUDINARY_API_SECRET,
      });
      this.mode = 'cloudinary';
      console.log('[Storage] Using Cloudinary');
    } else if (AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY && AWS_S3_BUCKET) {
      this.s3 = new S3Client({
        region: AWS_REGION ?? 'me-south-1',
        credentials: {
          accessKeyId: AWS_ACCESS_KEY_ID,
          secretAccessKey: AWS_SECRET_ACCESS_KEY,
        },
      });
      this.mode = 's3';
      console.log('[Storage] Using AWS S3');
    } else {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
      this.mode = 'local';
      console.log('[Storage] AWS not configured — using local disk storage at ./uploads/');
    }
  }

  async upload(folder: string, file: Express.Multer.File): Promise<string> {
    if (this.mode === 'cloudinary') return this.uploadToCloudinary(folder, file);
    if (this.mode === 's3') {
      const filename = `${randomUUID()}${path.extname(file.originalname)}`;
      return this.uploadToS3(folder, filename, file);
    }
    const filename = `${randomUUID()}${path.extname(file.originalname)}`;
    return this.saveLocally(folder, filename, file);
  }

  async uploadBuffer(folder: string, buffer: Buffer, filename: string, mimetype: string): Promise<string> {
    if (this.mode === 'cloudinary') return this.uploadBufferToCloudinary(folder, buffer, filename, mimetype);
    if (this.mode === 's3') return this.uploadBufferToS3(folder, filename, buffer, mimetype);
    return this.saveBufferLocally(folder, filename, buffer);
  }

  async delete(fileUrl: string): Promise<void> {
    if (this.mode === 'cloudinary') return this.deleteFromCloudinary(fileUrl);
    if (this.mode === 's3') return this.deleteFromS3(fileUrl);
    this.deleteLocally(fileUrl);
  }

  // ─── Cloudinary ───────────────────────────────────────────────────────────────

  private uploadToCloudinary(folder: string, file: Express.Multer.File): Promise<string> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'auto' },
        (error, result) => {
          if (error || !result) {
            return reject(
              new InternalServerErrorException(
                `Cloudinary upload failed: ${error?.message ?? 'unknown error'}`,
              ),
            );
          }
          resolve(result.secure_url);
        },
      );
      stream.end(file.buffer);
    });
  }

  private async deleteFromCloudinary(fileUrl: string): Promise<void> {
    try {
      const publicId = this.extractCloudinaryPublicId(fileUrl);
      if (publicId) await cloudinary.uploader.destroy(publicId);
    } catch {
      // Ignore deletion errors — file may already be gone
    }
  }

  private extractCloudinaryPublicId(url: string): string {
    // https://res.cloudinary.com/{cloud}/image/upload/v{version}/{folder}/{file}.ext
    const parts = url.split('/upload/');
    if (parts.length < 2) return '';
    const afterUpload = parts[1].replace(/^v\d+\//, ''); // strip version
    return afterUpload.replace(/\.[^.]+$/, '');           // strip extension
  }

  // ─── S3 ───────────────────────────────────────────────────────────────────────

  private async uploadToS3(
    folder: string,
    filename: string,
    file: Express.Multer.File,
  ): Promise<string> {
    const key = `${folder}/${filename}`;
    try {
      await this.s3!.send(
        new PutObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );
    } catch (err) {
      throw new InternalServerErrorException(
        `S3 upload failed: ${(err as Error).message}`,
      );
    }
    return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  }

  private async deleteFromS3(fileUrl: string): Promise<void> {
    const url = new URL(fileUrl);
    const key = url.pathname.slice(1);
    await this.s3!.send(
      new DeleteObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: key,
      }),
    );
  }

  // ─── Local disk ───────────────────────────────────────────────────────────────

  private saveLocally(
    folder: string,
    filename: string,
    file: Express.Multer.File,
  ): string {
    const dir = path.join(this.uploadsDir, folder);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, filename), file.buffer);
    const port = process.env.PORT ?? 3000;
    return `http://localhost:${port}/uploads/${folder}/${filename}`;
  }

  private deleteLocally(fileUrl: string): void {
    try {
      const url = new URL(fileUrl);
      const filePath = path.join(this.uploadsDir, url.pathname.replace('/uploads/', ''));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {
      // File may not exist — ignore
    }
  }

  // ─── Buffer upload variants (for in-memory files such as generated PDFs) ──────

  private uploadBufferToCloudinary(folder: string, buffer: Buffer, filename: string, mimetype: string): Promise<string> {
    const resourceType = mimetype === 'application/pdf' ? 'raw' : 'auto';
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, public_id: `${folder}/${filename.replace(/\.[^.]+$/, '')}`, resource_type: resourceType as any },
        (error, result) => {
          if (error || !result) {
            return reject(
              new InternalServerErrorException(
                `Cloudinary upload failed: ${error?.message ?? 'unknown error'}`,
              ),
            );
          }
          resolve(result.secure_url);
        },
      );
      stream.end(buffer);
    });
  }

  private async uploadBufferToS3(folder: string, filename: string, buffer: Buffer, mimetype: string): Promise<string> {
    const key = `${folder}/${filename}`;
    try {
      await this.s3!.send(
        new PutObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: key,
          Body: buffer,
          ContentType: mimetype,
        }),
      );
    } catch (err) {
      throw new InternalServerErrorException(`S3 upload failed: ${(err as Error).message}`);
    }
    return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  }

  private saveBufferLocally(folder: string, filename: string, buffer: Buffer): string {
    const dir = path.join(this.uploadsDir, folder);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, filename), buffer);
    const port = process.env.PORT ?? 3000;
    return `http://localhost:${port}/uploads/${folder}/${filename}`;
  }
}
