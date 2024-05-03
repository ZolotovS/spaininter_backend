import { HttpStatus, Injectable } from '@nestjs/common';
import { AddChannelDto } from './dto/add-channel.dto';
import { TgChannel } from './telegram-newsletter.model';
import { InjectModel } from '@nestjs/sequelize';
import { DeleteChannelDto } from './dto/delete-channel.dto';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { TG_API_URL } from '../common/constance';
import { col } from 'sequelize';
import { Markup, Telegraf } from 'telegraf';

@Injectable()
export class TelegramNewsletterService {
  constructor(
    @InjectModel(TgChannel) private tgChannelModel: typeof TgChannel,
    private readonly configService: ConfigService,
  ) {}

  // create channel
  public async addChannel(dto: AddChannelDto) {
    await this.tgChannelModel.create({
      channel_id: dto.channelId,
    });

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Channel added successfully',
    };
  }

  // delete channel
  public async deleteChannel(dto: DeleteChannelDto) {
    const id = parseInt(dto.id);
    const channel = await this.tgChannelModel.findByPk(id);
    if (!channel) {
      return { statusCode: HttpStatus.NOT_FOUND, message: 'Channel not found' };
    }
    await channel.destroy();
    return {
      statusCode: HttpStatus.OK,
      message: 'Channel deleted successfully',
    };
  }

  public async getChannels() {
    const channels = await this.tgChannelModel.findAll({
      attributes: ['id', [col('channel_id'), 'channelId']],
    });

    return {
      statusCode: HttpStatus.OK,
      message: 'Channels fetched successfully',
      data: {
        channels,
      },
    };
  }

  // send newsletter
  public async sendNewsletter(text: string, link: string) {
    const NEWSLETTER_BOT_TOKEN = this.configService.get('NEWSLETTER_BOT_TOKEN');

    const channels = await this.tgChannelModel.findAll({
      attributes: ['channel_id'],
    });

    const bot = new Telegraf(NEWSLETTER_BOT_TOKEN);

    // send newsletter to all channels
    for (const channel of channels) {
      try {
        await bot.telegram.sendMessage(`-${channel.channel_id}`, text, {
          parse_mode: 'MarkdownV2',
          reply_markup: {
            inline_keyboard: [[Markup.button.url('Full', link)]],
          },
        });
      } catch (err) {
        console.error(err);
      }
    }
  }
}
