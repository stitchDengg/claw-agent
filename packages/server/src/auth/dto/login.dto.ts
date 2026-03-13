import { IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: '用户名和密码不能为空' })
  username!: string;

  @IsString()
  @IsNotEmpty({ message: '用户名和密码不能为空' })
  password!: string;
}
