import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new rider account' })
  @ApiResponse({ status: 201, description: 'Returns access_token, refresh_token, and user' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Returns access_token, refresh_token, and user' })
  login(@Body() dto: LoginDto, @Req() req: any) {
    return this.authService.login(dto, req.headers['user-agent']);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a new access token using refresh token' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshAccessToken(dto.refresh_token);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Invalidate current session' })
  logout(@Req() req: any) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64').toString(),
    );
    return this.authService.logout(payload.sessionId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({ status: 200, description: 'Returns current user profile' })
  me(@CurrentUser() user: any) {
    return this.authService.getMe(user.id);
  }
}
