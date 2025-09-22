import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { Team, TeamMember, ApiResponse, PaginatedResponse, Activity } from '../types';

// Initialize Firebase Admin SDK
if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();

// Helper function to create activity log
async function createActivity(
  userId: string,
  userName: string,
  userRole: string,
  type: string,
  entityId: string,
  entityType: string,
  description: string,
  metadata?: any
) {
  const activity: Activity = {
    userId,
    userName,
    userRole: userRole as 'student' | 'alumni' | 'admin',
    type: type as any,
    entityId,
    entityType: entityType as any,
    description,
    createdAt: new Date()
  };

  // Only add metadata if it's not undefined
  if (metadata !== undefined) {
    activity.metadata = metadata;
  }

  await db.collection('activities').add(activity);
}

// GET /api/teams - Get teams with filtering and pagination
async function getTeams(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const search = url.searchParams.get('search') || '';
    const userId = url.searchParams.get('userId') || '';
    const isPrivate = url.searchParams.get('isPrivate');
    const tags = url.searchParams.get('tags')?.split(',').filter(Boolean) || [];

    let query = db.collection('teams').orderBy('createdAt', 'desc');

    // Apply filters
    if (isPrivate !== null && isPrivate !== undefined) {
      query = query.where('isPrivate', '==', isPrivate === 'true');
    }
    if (tags.length > 0) {
      query = query.where('tags', 'array-contains-any', tags);
    }

    // Get total count for pagination
    const countSnapshot = await query.get();
    let teams: Team[] = [];
    
    countSnapshot.forEach((doc) => {
      const data = doc.data();
      teams.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      } as Team);
    });

    // Filter by user membership if userId provided
    if (userId) {
      teams = teams.filter(team => 
        team.members.some(member => member.userId === userId)
      );
    }

    // Apply text search
    if (search) {
      teams = teams.filter(team =>
        team.name.toLowerCase().includes(search.toLowerCase()) ||
        team.description.toLowerCase().includes(search.toLowerCase())
      );
    }

    const total = teams.length;

    // Apply pagination
    const offset = (page - 1) * limit;
    const paginatedTeams = teams.slice(offset, offset + limit);

    const response: PaginatedResponse<Team> = {
      success: true,
      data: paginatedTeams,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': '*'
      },
      body: JSON.stringify(response)
    };
  } catch (error: any) {
    context.error('Error getting teams:', error);
    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error'
      })
    };
  }
}

// GET /api/teams/{id} - Get a specific team
async function getTeam(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const teamId = request.params.id;
    if (!teamId) {
      return {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Team ID is required'
        })
      };
    }

    const doc = await db.collection('teams').doc(teamId).get();
    if (!doc.exists) {
      return {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Team not found'
        })
      };
    }

    const data = doc.data();
    const team: Team = {
      id: doc.id,
      ...data,
      createdAt: data?.createdAt?.toDate(),
      updatedAt: data?.updatedAt?.toDate(),
    } as Team;

    const response: ApiResponse<Team> = {
      success: true,
      data: team
    };

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(response)
    };
  } catch (error: any) {
    context.error('Error getting team:', error);
    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error'
      })
    };
  }
}

// POST /api/teams - Create a new team
async function createTeam(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const body = await request.json() as Partial<Team>;
    
    if (!body.name || !body.createdBy || !body.createdByName) {
      return {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Name, createdBy, and createdByName are required'
        })
      };
    }



    const now = new Date();
    const ownerMember: TeamMember = {
      userId: body.createdBy,
      userName: body.createdByName,
      userRole: 'student', // Should be passed from client
      teamRole: 'owner',
      joinedAt: now
    };

    const team: Omit<Team, 'id'> = {
      name: body.name,
      description: body.description || '',
      createdBy: body.createdBy,
      createdByName: body.createdByName,
      members: [ownerMember],
      isPrivate: body.isPrivate !== undefined ? body.isPrivate : false,
      tags: body.tags || [],
      createdAt: now
    };

    const docRef = await db.collection('teams').add(team);
    
    // Create activity log
    await createActivity(
      team.createdBy,
      team.createdByName,
      'student',
      'team_created',
      docRef.id,
      'team',
      `Created team "${team.name}"`
    );

    const response: ApiResponse<{ id: string }> = {
      success: true,
      data: { id: docRef.id },
      message: 'Team created successfully'
    };

    return {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(response)
    };
  } catch (error: any) {
    context.error('Error creating team:', error);
    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error'
      })
    };
  }
}

// PUT /api/teams/{id} - Update a team
async function updateTeam(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const teamId = request.params.id;
    if (!teamId) {
      return {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Team ID is required'
        })
      };
    }

    const body = await request.json() as Partial<Team>;
    
    const teamDoc = await db.collection('teams').doc(teamId).get();
    if (!teamDoc.exists) {
      return {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Team not found'
        })
      };
    }

    // Update team
    const updateData = {
      ...body,
      updatedAt: new Date()
    };
    
    // Remove fields that shouldn't be updated via this endpoint
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.createdBy;
    delete updateData.members;

    await db.collection('teams').doc(teamId).update(updateData);

    const response: ApiResponse<null> = {
      success: true,
      message: 'Team updated successfully'
    };

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(response)
    };
  } catch (error: any) {
    context.error('Error updating team:', error);
    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error'
      })
    };
  }
}

// POST /api/teams/{id}/join - Join a team
async function joinTeam(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const teamId = request.params.id;
    if (!teamId) {
      return {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Team ID is required'
        })
      };
    }

    const body = await request.json() as {
      userId: string;
      userName: string;
      userRole: 'student' | 'alumni' | 'admin';
    };

    if (!body.userId || !body.userName) {
      return {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'UserId and userName are required'
        })
      };
    }

    const teamDoc = await db.collection('teams').doc(teamId).get();
    if (!teamDoc.exists) {
      return {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Team not found'
        })
      };
    }

    const teamData = teamDoc.data() as Team;
    
    // Check if user is already a member
    const existingMember = teamData.members.find(member => member.userId === body.userId);
    if (existingMember) {
      return {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'User is already a member of this team'
        })
      };
    }

    const newMember: TeamMember = {
      userId: body.userId,
      userName: body.userName,
      userRole: body.userRole || 'student',
      teamRole: 'viewer',
      joinedAt: new Date()
    };

    // Add member to team
    await db.collection('teams').doc(teamId).update({
      members: [...teamData.members, newMember],
      updatedAt: new Date()
    });

    // Create activity log
    await createActivity(
      body.userId,
      body.userName,
      body.userRole || 'student',
      'team_joined',
      teamId,
      'team',
      `Joined team "${teamData.name}"`
    );

    const response: ApiResponse<null> = {
      success: true,
      message: 'Successfully joined team'
    };

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(response)
    };
  } catch (error: any) {
    context.error('Error joining team:', error);
    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error'
      })
    };
  }
}

// PUT /api/teams/{id}/members/{userId} - Update member role
async function updateMemberRole(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const teamId = request.params.id;
    const userId = request.params.userId;
    
    if (!teamId || !userId) {
      return {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Team ID and User ID are required'
        })
      };
    }

    const body = await request.json() as {
      teamRole: 'owner' | 'admin' | 'editor' | 'viewer';
      updatedBy: string;
    };

    if (!body.teamRole || !body.updatedBy) {
      return {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Team role and updatedBy are required'
        })
      };
    }

    const teamDoc = await db.collection('teams').doc(teamId).get();
    if (!teamDoc.exists) {
      return {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Team not found'
        })
      };
    }

    const teamData = teamDoc.data() as Team;
    
    // Check if updater has permission (must be owner or admin)
    const updater = teamData.members.find(member => member.userId === body.updatedBy);
    if (!updater || (updater.teamRole !== 'owner' && updater.teamRole !== 'admin')) {
      return {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Insufficient permissions to update member role'
        })
      };
    }

    // Update member role
    const updatedMembers = teamData.members.map(member => 
      member.userId === userId 
        ? { ...member, teamRole: body.teamRole }
        : member
    );

    await db.collection('teams').doc(teamId).update({
      members: updatedMembers,
      updatedAt: new Date()
    });

    const response: ApiResponse<null> = {
      success: true,
      message: 'Member role updated successfully'
    };

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(response)
    };
  } catch (error: any) {
    context.error('Error updating member role:', error);
    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error'
      })
    };
  }
}

// DELETE /api/teams/{id}/members/{userId} - Remove member from team
async function removeMember(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const teamId = request.params.id;
    const userId = request.params.userId;
    
    if (!teamId || !userId) {
      return {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Team ID and User ID are required'
        })
      };
    }

    const teamDoc = await db.collection('teams').doc(teamId).get();
    if (!teamDoc.exists) {
      return {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Team not found'
        })
      };
    }

    const teamData = teamDoc.data() as Team;
    
    // Cannot remove the owner
    const memberToRemove = teamData.members.find(member => member.userId === userId);
    if (memberToRemove?.teamRole === 'owner') {
      return {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Cannot remove team owner'
        })
      };
    }

    // Remove member
    const updatedMembers = teamData.members.filter(member => member.userId !== userId);

    await db.collection('teams').doc(teamId).update({
      members: updatedMembers,
      updatedAt: new Date()
    });

    const response: ApiResponse<null> = {
      success: true,
      message: 'Member removed successfully'
    };

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(response)
    };
  } catch (error: any) {
    context.error('Error removing member:', error);
    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error'
      })
    };
  }
}

// DELETE /api/teams/{id} - Delete a team
async function deleteTeam(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const teamId = request.params.id;
    if (!teamId) {
      return {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Team ID is required'
        })
      };
    }

    const teamDoc = await db.collection('teams').doc(teamId).get();
    if (!teamDoc.exists) {
      return {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Team not found'
        })
      };
    }

    // Delete team and related data
    const batch = db.batch();
    
    // Delete the team
    batch.delete(teamDoc.ref);
    
    // Note: In a real application, you might want to handle team notes and files differently
    // For example, transfer ownership or mark as orphaned rather than delete
    
    await batch.commit();

    const response: ApiResponse<null> = {
      success: true,
      message: 'Team deleted successfully'
    };

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(response)
    };
  } catch (error: any) {
    context.error('Error deleting team:', error);
    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error'
      })
    };
  }
}

// Register HTTP functions
app.http('teams-get', {
  methods: ['GET'],
  route: 'teams',
  authLevel: 'anonymous',
  handler: getTeams
});

app.http('team-get', {
  methods: ['GET'],
  route: 'teams/{id}',
  authLevel: 'anonymous',
  handler: getTeam
});

app.http('team-put', {
  methods: ['PUT'],
  route: 'teams/{id}',
  authLevel: 'anonymous',
  handler: updateTeam
});

app.http('teams-post', {
  methods: ['POST'],
  route: 'teams',
  authLevel: 'anonymous',
  handler: createTeam
});

app.http('team-join', {
  methods: ['POST'],
  route: 'teams/{id}/join',
  authLevel: 'anonymous',
  handler: joinTeam
});

app.http('team-member-role', {
  methods: ['PUT'],
  route: 'teams/{id}/members/{userId}',
  authLevel: 'anonymous',
  handler: updateMemberRole
});

app.http('team-member-remove', {
  methods: ['DELETE'],
  route: 'teams/{id}/members/{userId}',
  authLevel: 'anonymous',
  handler: removeMember
});

app.http('team-delete', {
  methods: ['DELETE'],
  route: 'teams/{id}',
  authLevel: 'anonymous',
  handler: deleteTeam
});

// Handle OPTIONS requests for CORS
app.http('teams-options', {
  methods: ['OPTIONS'],
  route: 'teams',
  authLevel: 'anonymous',
  handler: async () => ({
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': '*'
    }
  })
});

app.http('team-options', {
  methods: ['OPTIONS'],
  route: 'teams/{id}',
  authLevel: 'anonymous',
  handler: async () => ({
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': '*'
    }
  })
});

app.http('team-join-options', {
  methods: ['OPTIONS'],
  route: 'teams/{id}/join',
  authLevel: 'anonymous',
  handler: async () => ({
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': '*'
    }
  })
});

app.http('team-member-options', {
  methods: ['OPTIONS'],
  route: 'teams/{id}/members/{userId}',
  authLevel: 'anonymous',
  handler: async () => ({
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': '*'
    }
  })
});