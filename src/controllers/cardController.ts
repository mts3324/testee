import { Response } from "express";
import { Card } from "../models/card";
import { AppError } from "../middlewares/errorHandler";
import { AuthRequest } from "../types/express";
import { User } from "../models/user";
import fs from "fs";
import path from "path";

export class CardController {
  async getAllCards(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError("Usuário não autenticado", 401);
      }

      const cards = await Card.find({ userId })
        .sort({ createdAt: -1 })
        .populate({
          path: "listId",
          populate: {
            path: "userId",
          },
        });

      res.status(200).json({
        status: "success",
        data: cards.map((card) => ({
          id: card._id,
          title: card.title,
          priority: card.priority,
          is_published: card.is_published,
          userId: card.userId,
          listId: card.listId,
        })),
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError("Erro ao buscar os cards", 500);
    }
  }

  async getCardById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const card = req.card;

      res.status(200).json({
        status: "success",
        data: {
          id: card._id,
          title: card.title,
          priority: card.priority,
          is_published: card.is_published,
          userId: card.userId,
          listId: card.listId,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError("Erro ao buscar cartão", 500);
    }
  }

  async getCardByTitle(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { title } = req.params;
      const card = await Card.findOne({ title });

      res.status(200).json({
        status: "success",
        data: card,
      });
    } catch (error) {
      throw new AppError("Erro ao buscar cartão", 500);
    }
  }

  async getCardsByListId(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { listId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError("Usuário não autenticado", 401);
      }

      const cards = await Card.find({ listId, userId });

      res.status(200).json({
        status: "success",
        data: cards.map((card) => ({
          id: card._id,
          title: card.title,
          priority: card.priority,
          is_published: card.is_published,
          userId: card.userId,
        })),
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError("Erro ao buscar cartões da lista", 500);
    }
  }

  async createCard(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { title, listId } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError("Usuário não autenticado", 401);
      }

      const card = await Card.create({
        title,
        listId,
        userId,
      });

      res.status(201).json({
        status: "success",
        data: {
          id: card._id,
          title: card.title,
          listId: card.listId,
          userId: card.userId,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError("Erro ao criar cartão", 500);
    }
  }

  async likeCard(req: AuthRequest, res: Response): Promise<void> {
    try {
      const card = req.card;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError("Usuário não autenticado", 401);
      }

      card.likes = Number(card.likes) + 1;
      await card.save();

      if (card.likes % 20 === 0) {
        const user = await User.findById(card.userId);
        if (user) {
          user.orgPoints = Number(user.orgPoints) + 1;
          await user.save();
        }
      }

      res.status(200).json({
        status: "success",
        data: {
          id: card._id,
          title: card.title,
          likes: card.likes,
          userId: card.userId,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError("Erro ao dar like no cartão", 500);
    }
  }

  async editCard(req: AuthRequest, res: Response): Promise<void> {
    try {
      const card = req.card;
      const { title, priority, is_published, image_url } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError("Usuário não autenticado", 401);
      }

      if (card.userId.toString() !== userId) {
        throw new AppError("Você não tem permissão para editar este cartão", 403);
      }

      const updatedCard = await Card.findByIdAndUpdate(
        card._id,
        { title, priority, is_published, image_url },
        { new: true, runValidators: true }
      );

      if (!updatedCard) {
        throw new AppError("Cartão não encontrado", 404);
      }

      res.status(200).json({
        status: "success",
        data: {
          id: updatedCard._id,
          title: updatedCard.title,
          userId: updatedCard.userId,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError("Erro ao editar cartão", 500);
    }
  }

  async getCardsByUserId(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError("Usuário não autenticado", 401);
      }

      const cards = await Card.find({ userId })
        .sort({ createdAt: -1 })
        .populate({
          path: "tipoId",
          select: "nome",
        });

      res.status(200).json({
        status: "success",
        data: cards,
      });
    } catch (error) {
      throw new AppError("Erro ao buscar cards do usuário", 500);
    }
  }

  async deleteCard(req: AuthRequest, res: Response): Promise<void> {
    try {
      const card = req.card;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError("Usuário não autenticado", 401);
      }

      if (card.userId.toString() !== userId) {
        throw new AppError("Você não tem permissão para deletar este cartão", 403);
      }

      await Card.findByIdAndDelete(card._id);
      res.status(204).send();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError("Erro ao deletar cartão", 500);
    }
  }

  async uploadPdf(req: AuthRequest, res: Response): Promise<void> {
    try {
      const card = req.card;
      const file = req.file;

      if (!file) {
        throw new AppError("Nenhum arquivo PDF foi enviado", 400);
      }

      if (!card) {
        throw new AppError("Card não encontrado", 404);
      }

      const pdfData = {
        url: `/uploads/pdfs/${file.filename}`,
        filename: file.originalname,
        uploaded_at: new Date(),
        size_kb: Math.round(file.size / 1024),
      };

      if (!card.pdfs) {
        card.pdfs = [];
      }

      card.pdfs.push(pdfData);
      await card.save();

      res.status(200).json({
        status: "success",
        message: "PDF anexado com sucesso",
        data: pdfData,
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError("Erro ao anexar PDF", 500);
    }
  }

  async removePdf(req: AuthRequest, res: Response): Promise<void> {
    try {
      const card = req.card;
      const { pdfIndex } = req.params;

      if (!card) {
        throw new AppError("Card não encontrado", 404);
      }

      if (!card.pdfs || !card.pdfs[parseInt(pdfIndex)]) {
        throw new AppError("PDF não encontrado", 404);
      }

      const pdfToRemove = card.pdfs[parseInt(pdfIndex)];
      const filePath = path.join(process.cwd(), pdfToRemove.url);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      card.pdfs.splice(parseInt(pdfIndex), 1);
      await card.save();

      res.status(200).json({
        status: "success",
        message: "PDF removido com sucesso",
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError("Erro ao remover PDF", 500);
    }
  }
}
