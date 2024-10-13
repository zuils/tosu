import { config, wLogger } from '@tosu/common';
import EventEmitter from 'events';
import { Process } from 'tsprocess/dist/process';

import { buildResult } from '@/api/utils/buildResult';
import { buildResult as buildResultV2 } from '@/api/utils/buildResultV2';
import { buildResult as buildResultV2Precise } from '@/api/utils/buildResultV2Precise';
import { InstanceManager } from '@/instances/manager';
import { AbstractMemory } from '@/memory';
import { BassDensity } from '@/states/bassDensity';
import { BeatmapPP } from '@/states/beatmap';
import { Gameplay } from '@/states/gameplay';
import { Global } from '@/states/global';
import { Menu } from '@/states/menu';
import { ResultScreen } from '@/states/resultScreen';
import { Settings } from '@/states/settings';
import { TourneyManager } from '@/states/tourney';
import { User } from '@/states/user';

export interface DataRepoList {
    process: Process;
    memory: AbstractMemory;

    settings: Settings;

    global: Global;
    beatmapPP: BeatmapPP;
    menu: Menu;
    bassDensity: BassDensity;
    gameplay: Gameplay;
    resultScreen: ResultScreen;
    tourneyManager: TourneyManager;
    user: User;
}

export abstract class AbstractInstance {
    pid: number;
    process: Process;
    abstract memory: AbstractMemory;
    path: string = '';

    isReady: boolean;
    isDestroyed: boolean = false;
    isTourneyManager: boolean = false;
    isTourneySpectator: boolean = false;

    ipcId: number = 0;

    previousState: string = '';
    previousMP3Length: number = 0;
    previousTime: number = 0;

    emitter: EventEmitter = new EventEmitter();

    states: Partial<DataRepoList> = {};

    constructor(pid: number) {
        this.pid = pid;

        this.process = new Process(this.pid);
        this.path = this.process.path;

        this.set('process', this.process);

        this.set('settings', new Settings(this));
        this.set('global', new Global(this));
        this.set('beatmapPP', new BeatmapPP(this));
        this.set('menu', new Menu(this));
        this.set('bassDensity', new BassDensity(this));
        this.set('gameplay', new Gameplay(this));
        this.set('resultScreen', new ResultScreen(this));
        this.set('tourneyManager', new TourneyManager(this));
        this.set('user', new User(this));

        this.watchProcessHealth = this.watchProcessHealth.bind(this);
    }

    /**
     * Sets service instance
     */
    set<TName extends keyof DataRepoList>(
        serviceName: TName,
        instance: DataRepoList[TName]
    ): void {
        this.states[serviceName] = instance;
    }

    /**
     * Returns requested service, otherwise returns null
     */
    get<TName extends keyof DataRepoList>(
        serviceName: TName
    ): DataRepoList[TName] | null {
        const instance = this.states[serviceName];
        if (!instance) {
            return null;
        }

        return instance;
    }

    abstract start(): void;

    abstract injectGameOverlay(): void;

    watchProcessHealth() {
        if (this.isDestroyed === true) return;

        if (!Process.isProcessExist(this.process.handle)) {
            this.isDestroyed = true;
            wLogger.warn(
                `OI(watchProcessHealth) osu!.exe at ${this.pid} got destroyed `
            );
            this.emitter.emit('onDestroy', this.pid);
        }

        setTimeout(this.watchProcessHealth, config.pollRate);
    }

    setTourneyIpcId(ipcId: number) {
        this.ipcId = ipcId;
    }

    setIsTourneySpectator(newVal: boolean) {
        this.isTourneySpectator = newVal;
    }

    getState(instanceManager: InstanceManager) {
        return buildResult(instanceManager);
    }

    getStateV2(instanceManager: InstanceManager) {
        return buildResultV2(instanceManager);
    }

    getPreciseData(instanceManager: InstanceManager) {
        return buildResultV2Precise(instanceManager);
    }

    /**
     * Returns map of requested services\
     * Throws if any of requested services is not currently present
     */
    getServices<T extends (keyof DataRepoList)[]>(
        services: T
    ): Pick<DataRepoList, T[number]> | never {
        return services.reduce(
            (acc, item: keyof Pick<DataRepoList, T[number]>) => {
                const instance = this.get(item);
                if (!instance || instance === null) {
                    throw new Error(
                        `Service "${item}" was not set in DataRepo list`
                    );
                }
                acc[item] = instance as never;
                return acc;
            },
            {} as Pick<DataRepoList, T[number]>
        );
    }
}
