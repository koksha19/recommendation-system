import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'Lev', description: 'User name' })
  @IsString()
  @MinLength(2)
  username: string;
}

export class UserResponseDto {
  @ApiProperty()
  userId: number;

  @ApiProperty()
  username: string;
}
