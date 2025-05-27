import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('blacklisted_tokens')
export class BlacklistedToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  token: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column()
  expiresAt: Date;
}