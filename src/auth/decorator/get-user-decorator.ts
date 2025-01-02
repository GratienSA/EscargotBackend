import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetUser = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    console.log('Request in GetUser decorator:', request);
    console.log('User in GetUser decorator:', request.user);
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
