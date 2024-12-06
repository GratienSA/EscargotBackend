import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    UnauthorizedException,
  } from '@nestjs/common';
  
  @Injectable()
  export class AdminGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      const request = context.switchToHttp().getRequest();
      const user = request.user;
  
      if (!user) {
        throw new UnauthorizedException('User not authenticated');
      }
  
      if (user.role && user.role.name === 'admin') {
        return true;
      } else {
        throw new ForbiddenException('Admin role required');
      }
    }
  }