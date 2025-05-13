import { Request } from "express";
import { JwtPayload } from "jsonwebtoken";
import { Card } from "../models/card";
import { List } from "../models/list";

export interface AuthRequest extends Request {
  user?: JwtPayload;
  card?: Card;
  list?: List;
  lists?: List[];
  file?: Express.Multer.File; 
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      card?: Card;
      list?: List;
      lists?: List[];
      file?: Multer.File; 
    }
  }
}
