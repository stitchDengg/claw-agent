import { IsString, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(3, { message: '用户名长度应为 3-20 个字符' })
  @MaxLength(20, { message: '用户名长度应为 3-20 个字符' })
  username!: string;

  @IsString()
  @MinLength(6, { message: '密码长度至少为 6 个字符' })
  password!: string;
}
