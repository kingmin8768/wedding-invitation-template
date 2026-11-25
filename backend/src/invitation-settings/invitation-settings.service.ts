import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DEFAULT_INVITATION_SETTINGS,
  InvitationAccountEntry,
  InvitationSettingsPayload,
} from './default-invitation-settings';
import { InvitationSetting } from './invitation-setting.entity';

const DEFAULT_SETTINGS_KEY = 'default';
const MAX_LIST_ITEMS = 20;

const cloneDefaultSettings = (): InvitationSettingsPayload =>
  JSON.parse(JSON.stringify(DEFAULT_INVITATION_SETTINGS));

const readString = (value: unknown, fallback: string) =>
  typeof value === 'string' ? value.trim() : fallback;

const readFiniteNumber = (
  value: unknown,
  fallback: number,
  min?: number,
  max?: number,
) => {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return fallback;
  }

  if (min !== undefined && num < min) {
    return fallback;
  }

  if (max !== undefined && num > max) {
    return fallback;
  }

  return num;
};

const readStringArray = (value: unknown, fallback: string[]) => {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, MAX_LIST_ITEMS);
};

const readAccountsArray = (
  value: unknown,
  fallback: InvitationAccountEntry[],
): InvitationAccountEntry[] => {
  if (!Array.isArray(value)) {
    return fallback.map((item) => ({ ...item }));
  }

  return value
    .filter((item): item is Record<string, unknown> =>
      Boolean(item && typeof item === 'object'),
    )
    .map((item) => ({
      bank: typeof item.bank === 'string' ? item.bank.trim() : '',
      number: typeof item.number === 'string' ? item.number.trim() : '',
      name: typeof item.name === 'string' ? item.name.trim() : '',
    }))
    .filter((item) => item.bank || item.number || item.name)
    .slice(0, MAX_LIST_ITEMS);
};

export const mergeInvitationSettings = (
  base: InvitationSettingsPayload,
  override?: Partial<InvitationSettingsPayload> | null,
): InvitationSettingsPayload => {
  const source = override && typeof override === 'object' ? override : {};

  return {
    couple: {
      groom: {
        fullName: readString(
          source.couple?.groom?.fullName,
          base.couple.groom.fullName,
        ),
        firstName: readString(
          source.couple?.groom?.firstName,
          base.couple.groom.firstName,
        ),
      },
      bride: {
        fullName: readString(
          source.couple?.bride?.fullName,
          base.couple.bride.fullName,
        ),
        firstName: readString(
          source.couple?.bride?.firstName,
          base.couple.bride.firstName,
        ),
      },
    },
    parents: {
      groom: {
        father: readString(
          source.parents?.groom?.father,
          base.parents.groom.father,
        ),
        mother: readString(
          source.parents?.groom?.mother,
          base.parents.groom.mother,
        ),
        relation: readString(
          source.parents?.groom?.relation,
          base.parents.groom.relation,
        ),
      },
      bride: {
        father: readString(
          source.parents?.bride?.father,
          base.parents.bride.father,
        ),
        mother: readString(
          source.parents?.bride?.mother,
          base.parents.bride.mother,
        ),
        relation: readString(
          source.parents?.bride?.relation,
          base.parents.bride.relation,
        ),
      },
    },
    wedding: {
      year: Math.round(
        readFiniteNumber(source.wedding?.year, base.wedding.year, 1900, 2100),
      ),
      month: Math.round(
        readFiniteNumber(source.wedding?.month, base.wedding.month, 1, 12),
      ),
      day: Math.round(
        readFiniteNumber(source.wedding?.day, base.wedding.day, 1, 31),
      ),
      hour: Math.round(
        readFiniteNumber(source.wedding?.hour, base.wedding.hour, 0, 23),
      ),
      minute: Math.round(
        readFiniteNumber(source.wedding?.minute, base.wedding.minute, 0, 59),
      ),
      displayDate: readString(
        source.wedding?.displayDate,
        base.wedding.displayDate,
      ),
      monthLabel: readString(
        source.wedding?.monthLabel,
        base.wedding.monthLabel,
      ),
    },
    venue: {
      name: readString(source.venue?.name, base.venue.name),
      floor: readString(source.venue?.floor, base.venue.floor),
      address: readString(source.venue?.address, base.venue.address),
      lat: readFiniteNumber(source.venue?.lat, base.venue.lat, -90, 90),
      lng: readFiniteNumber(source.venue?.lng, base.venue.lng, -180, 180),
    },
    afterParty: {
      enabled:
        typeof source.afterParty?.enabled === 'boolean'
          ? source.afterParty.enabled
          : base.afterParty.enabled,
      timeText: readString(
        source.afterParty?.timeText,
        base.afterParty.timeText,
      ),
      address: readString(source.afterParty?.address, base.afterParty.address),
      postscript: readString(
        source.afterParty?.postscript,
        base.afterParty.postscript,
      ),
    },
    accounts: {
      groom: readAccountsArray(source.accounts?.groom, base.accounts.groom),
      bride: readAccountsArray(source.accounts?.bride, base.accounts.bride),
    },
    transport: {
      subway: readString(source.transport?.subway, base.transport.subway),
      buses: readStringArray(source.transport?.buses, base.transport.buses),
      shuttleBus: {
        enabled:
          typeof source.transport?.shuttleBus?.enabled === 'boolean'
            ? source.transport.shuttleBus.enabled
            : base.transport.shuttleBus.enabled,
        intro: readStringArray(
          source.transport?.shuttleBus?.intro,
          base.transport.shuttleBus.intro,
        ),
        schedules: readStringArray(
          source.transport?.shuttleBus?.schedules,
          base.transport.shuttleBus.schedules,
        ),
      },
      parking: readString(source.transport?.parking, base.transport.parking),
      wreathNotice: readStringArray(
        source.transport?.wreathNotice,
        base.transport.wreathNotice,
      ),
    },
    share: {
      title: readString(source.share?.title, base.share.title),
      text: readString(source.share?.text, base.share.text),
    },
  };
};

@Injectable()
export class InvitationSettingsService {
  constructor(
    @InjectRepository(InvitationSetting)
    private readonly settingRepository: Repository<InvitationSetting>,
  ) {}

  async getPublicSettings(): Promise<InvitationSettingsPayload> {
    const existing = await this.settingRepository.findOne({
      where: { key: DEFAULT_SETTINGS_KEY },
    });

    if (!existing) {
      return cloneDefaultSettings();
    }

    try {
      const parsed = JSON.parse(
        existing.payloadJson,
      ) as Partial<InvitationSettingsPayload>;
      return mergeInvitationSettings(DEFAULT_INVITATION_SETTINGS, parsed);
    } catch {
      return cloneDefaultSettings();
    }
  }

  async updateSettings(
    input: Partial<InvitationSettingsPayload>,
  ): Promise<InvitationSettingsPayload> {
    const current = await this.getPublicSettings();
    const merged = mergeInvitationSettings(current, input);

    const record = this.settingRepository.create({
      key: DEFAULT_SETTINGS_KEY,
      payloadJson: JSON.stringify(merged),
    });
    await this.settingRepository.save(record);

    return merged;
  }

  async resetSettings(): Promise<InvitationSettingsPayload> {
    await this.settingRepository.delete({ key: DEFAULT_SETTINGS_KEY });
    return cloneDefaultSettings();
  }
}
