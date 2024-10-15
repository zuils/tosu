import path from 'path';

import { AbstractMemory, ScanPatterns } from '@/memory';
import type {
    IAudioVelocityBase,
    IBindingValue,
    IConfigValue,
    IGameplay,
    IGlobal,
    IGlobalPrecise,
    IHitErrors,
    IKeyOverlay,
    ILeaderboard,
    IMP3Length,
    IMenu,
    IOffsets,
    IResultScreen,
    ISettingsPointers,
    ITourney,
    ITourneyChat,
    ITourneyUser,
    IUser
} from '@/memory/types';
import type { ITourneyManagerChatItem } from '@/states/tourney';
import type { BindingsList, ConfigList } from '@/utils/settings.types';

type LazerPatternData = {
    spectatorClient: number;
};

export class LazerMemory extends AbstractMemory<LazerPatternData> {
    private scanPatterns: ScanPatterns = {
        spectatorClient: {
            pattern:
                '3F 00 00 80 3F 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 00 00 80 3F 01 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 ?? 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00',
            offset: -0x16f
        }
    };

    private gameBaseAddress: number;

    patterns: LazerPatternData = {
        spectatorClient: 0
    };

    private lazerToStableStatus = {
        '-4': 1, // Locally modified
        '-3': 1, // None
        '-2': 2, // Graveyard
        '-1': 2, // WIP
        0: 2,
        1: 4,
        2: 5,
        3: 6,
        4: 7
    };

    private gameBase() {
        if (!this.gameBaseAddress) {
            const spectatorClient = this.getPattern('spectatorClient');

            this.gameBaseAddress = this.process.readIntPtr(
                this.process.readIntPtr(spectatorClient + 0x90) + 0x90
            );
        }

        return this.gameBaseAddress;
    }

    private beatmapClock() {
        return this.process.readIntPtr(this.gameBase() + 0x4c8);
    }

    private finalClockSource() {
        return this.process.readIntPtr(this.beatmapClock() + 0x210);
    }

    private currentTime() {
        return this.process.readDouble(this.finalClockSource() + 0x30);
    }

    private basePath() {
        const storage = this.process.readIntPtr(this.gameBase() + 0x440);
        const underlyingStorage = this.process.readIntPtr(storage + 0x10);

        return this.process.readSharpStringPtr(underlyingStorage + 0x8);
    }

    private currentBeatmap() {
        const bindable = this.process.readIntPtr(this.gameBase() + 0x450);
        const workingBeatmap = this.process.readIntPtr(bindable + 0x20);
        const beatmapInfo = this.process.readIntPtr(workingBeatmap + 0x8);
        const beatmapSetInfo = this.process.readIntPtr(workingBeatmap + 0x10);

        return { info: beatmapInfo, setInfo: beatmapSetInfo };
    }

    private getBeatmapFiles(beatmapSetInfo: number): Record<string, string> {
        const result = {};

        const files = this.process.readIntPtr(beatmapSetInfo + 0x20);
        const size = this.process.readInt(files + 0x10);
        const items = this.process.readIntPtr(files + 0x8);

        for (let i = 0; i < size; i++) {
            const current = this.process.readIntPtr(items + 0x10 + 0x8 * i);

            const realmFile = this.process.readIntPtr(current + 0x18);

            const hash = this.process.readSharpStringPtr(realmFile + 0x18);
            const fileName = this.process.readSharpStringPtr(current + 0x20);

            result[fileName] = hash;
        }

        return result;
    }

    private toLazerPath(hash: string) {
        return `${hash[0]}\\${hash.substring(0, 2)}\\${hash}`;
    }

    getScanPatterns(): ScanPatterns {
        return this.scanPatterns;
    }

    audioVelocityBase(): IAudioVelocityBase {
        return [];
    }

    user(): IUser {
        return {
            name: 'Guest',
            accuracy: 0,
            rankedScore: 0,
            id: 0,
            level: 0,
            playCount: 0,
            playMode: 0,
            rank: 1,
            countryCode: 0,
            performancePoints: 0,
            rawBanchoStatus: 0,
            backgroundColour: 0xffffffff,
            rawLoginStatus: 0
        };
    }

    settingsPointers(): ISettingsPointers {
        throw new Error('Lazer:settingsPointers not implemented.');
    }

    configOffsets(address: number, list: ConfigList): IOffsets {
        console.log(address, list);

        throw new Error('Lazer:configOffsets not implemented.');
    }

    bindingsOffsets(address: number, list: BindingsList): IOffsets {
        console.log(address, list);

        throw new Error('Lazer:bindingsOffsets not implemented.');
    }

    configValue(
        address: number,
        position: number,
        list: ConfigList
    ): IConfigValue {
        console.log(address, position, list);
        throw new Error('Lazer:configValue not implemented.');
    }

    bindingValue(address: number, position: number): IBindingValue {
        console.log(address, position);
        throw new Error('Lazer:bindingValue not implemented.');
    }

    resultScreen(): IResultScreen {
        return {
            onlineId: 0,
            playerName: '',
            mods: 0,
            mode: 0,
            maxCombo: 0,
            score: 0,
            hit100: 0,
            hit300: 0,
            hit50: 0,
            hitGeki: 0,
            hitKatu: 0,
            hitMiss: 0,
            date: ''
        };
    }

    gameplay(): IGameplay {
        return {
            address: 0,
            retries: 0,
            playerName: '',
            mods: 0,
            mode: 0,
            score: 0,
            playerHPSmooth: 0,
            playerHP: 0,
            accuracy: 0,
            hit100: 0,
            hit300: 0,
            hit50: 0,
            hitGeki: 0,
            hitKatu: 0,
            hitMiss: 0,
            combo: 0,
            maxCombo: 0
        };
    }

    keyOverlay(mode: number): IKeyOverlay {
        console.log(mode);
        return {
            K1Pressed: false,
            K1Count: 0,
            K2Pressed: false,
            K2Count: 0,
            M1Pressed: false,
            M1Count: 0,
            M2Pressed: false,
            M2Count: 0
        };
    }

    hitErrors(): IHitErrors {
        return [];
    }

    global(): IGlobal {
        const filesFolder = path.join(this.basePath(), 'files');

        return {
            isWatchingReplay: 0,
            isReplayUiHidden: false,
            showInterface: false,
            chatStatus: 0,
            status: 0,
            gameTime: 0,
            menuMods: 0,
            skinFolder: filesFolder,
            memorySongsFolder: filesFolder
        };
    }

    globalPrecise(): IGlobalPrecise {
        return {
            time: this.currentTime()
        };
    }

    menu(previousChecksum: string): IMenu {
        const beatmap = this.currentBeatmap();
        const checksum = this.process.readSharpStringPtr(beatmap.info + 0x58);

        if (checksum === previousChecksum) {
            return '';
        }

        const rulesetInfo = this.process.readIntPtr(beatmap.info + 0x20);
        const metadata = this.process.readIntPtr(beatmap.info + 0x30);
        const difficulty = this.process.readIntPtr(beatmap.info + 0x28);
        const hash = this.process.readSharpStringPtr(beatmap.info + 0x50);
        const author = this.process.readIntPtr(metadata + 0x38);

        const files = this.getBeatmapFiles(beatmap.setInfo);

        const audioFilename =
            files[this.process.readSharpStringPtr(metadata + 0x50)];
        const backgroundFilename =
            files[this.process.readSharpStringPtr(metadata + 0x58)];

        return {
            gamemode: this.process.readInt(rulesetInfo + 0x30),
            checksum,
            filename: this.toLazerPath(hash),
            plays: 0,
            title: this.process.readSharpStringPtr(metadata + 0x18),
            titleOriginal: this.process.readSharpStringPtr(metadata + 0x20),
            artist: this.process.readSharpStringPtr(metadata + 0x28),
            artistOriginal: this.process.readSharpStringPtr(metadata + 0x30),
            ar: this.process.readFloat(difficulty + 0x34),
            cs: this.process.readFloat(difficulty + 0x2c),
            hp: this.process.readFloat(difficulty + 0x28),
            od: this.process.readFloat(difficulty + 0x30),
            audioFilename: this.toLazerPath(audioFilename),
            backgroundFilename: this.toLazerPath(backgroundFilename),
            folder: '',
            creator: this.process.readSharpStringPtr(author + 0x18),
            difficulty: this.process.readSharpStringPtr(metadata + 0x18),
            mapID: this.process.readInt(beatmap.info + 0xac),
            setID: this.process.readInt(beatmap.setInfo + 0x30),
            rankedStatus: Number(
                this.lazerToStableStatus[
                    this.process.readInt(beatmap.info + 0xa8)
                ]
            ),
            objectCount: this.process.readInt(beatmap.info + 0xb4)
        };
    }

    mp3Length(): IMP3Length {
        const beatmap = this.currentBeatmap();

        return this.process.readDouble(beatmap.info + 0x78);
    }

    tourney(): ITourney {
        throw new Error('Lazer:tourney not implemented.');
    }

    tourneyChat(messages: ITourneyManagerChatItem[]): ITourneyChat {
        console.log(messages);

        throw new Error('Lazer:tourneyChat not implemented.');
    }

    tourneyUser(): ITourneyUser {
        throw new Error('Lazer:tourneyUser not implemented.');
    }

    leaderboard(rulesetAddr: number): ILeaderboard {
        console.log(rulesetAddr);
        throw new Error('Lazer:tourneyUser not implemented.');
    }
}
