import { Module } from '@nestjs/common';
import { BRANCH_REPOSITORY_PORT } from '../domain/ports/branch-repository.port.js';
import { PostgresBranchRepository } from './persistence/postgres-branch.repository.js';
import {
  ListBranchesUseCase,
  GetBranchUseCase,
  CreateBranchUseCase,
  UpdateBranchUseCase,
  DeleteBranchUseCase,
} from '../application/use-cases/branch.use-cases.js';
import { BranchesController } from './http/branches.controller.js';

@Module({
  controllers: [BranchesController],
  providers: [
    { provide: BRANCH_REPOSITORY_PORT, useClass: PostgresBranchRepository },
    ListBranchesUseCase,
    GetBranchUseCase,
    CreateBranchUseCase,
    UpdateBranchUseCase,
    DeleteBranchUseCase,
  ],
  exports: [ListBranchesUseCase, GetBranchUseCase],
})
export class BranchModule { }
